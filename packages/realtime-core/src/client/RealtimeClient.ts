import {
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
  type HubConnection,
} from '@microsoft/signalr'
import type { RealtimeCoreConfig } from '../types/config'
import type { Message } from '../types/message'
import type { UserInfo, ConnectionStatus } from '../types/conversation'
import { ConnectionStatus as ConnectionStatusEnum } from '../types/conversation'
import type {
  RealtimeEventType,
  RealtimeEventMap,
  EventCallback,
  ReadReceiptInfo,
  DeliveryReceiptInfo,
  MessageWithdrawnInfo,
  MessageDeletedInfo,
} from '../types/events'
import { EventManager } from './EventManager'
import { ReconnectManager } from './ReconnectManager'
import { CircuitBreaker, CircuitState } from './CircuitBreaker'
import { AuthService } from '../auth/AuthService'
import { SessionManager } from '../auth/SessionManager'
import { TokenRefresher } from '../auth/TokenRefresher'
import { MessageService } from '../message/MessageService'
import { ConversationService } from '../conversation/ConversationService'
import { UploadService } from '../upload/UploadService'
import { isSystemMessage, isDisplayableSystemMessage } from '../message/SystemMessage'
import { mapToMessage, mapToConversationList, mapToUserInfo } from '../message/RealtimeMessageMapper'
import logger, { setLogLevel } from '../utils/logger'

/** Realtime 核心客户端（基于 SignalR） */
export class RealtimeClient {
  private config: RealtimeCoreConfig
  private hub: HubConnection | null = null
  private currentUserId = ''
  private currentToken = ''
  private currentConversationId = ''
  private hubListenersRegistered = false
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null

  /** 连接状态 */
  private _connectionStatus: ConnectionStatus = ConnectionStatusEnum.DISCONNECTED

  /** 主动关闭标志（logout/destroy 时设置，断开不触发重连） */
  private _isManualClose = false

  /** 重连管理器 */
  private reconnectManager: ReconnectManager

  /** 熔断器 */
  private circuitBreaker: CircuitBreaker

  /** 事件管理器 */
  readonly events: EventManager

  /** 认证服务 */
  readonly auth: AuthService

  /** 会话管理 */
  readonly session: SessionManager

  /** Token 自动续期 */
  readonly tokenRefresher: TokenRefresher

  /** 消息服务 */
  readonly message: MessageService

  /** 会话服务 */
  readonly conversation: ConversationService

  /** 文件上传服务 */
  readonly upload: UploadService

  constructor(config: RealtimeCoreConfig) {
    this.config = config
    setLogLevel(config.logLevel ?? 2)

    this.events = new EventManager()
    this.auth = new AuthService(config.baseURL)
    this.session = new SessionManager()
    this.tokenRefresher = new TokenRefresher(this.auth, this)
    this.message = new MessageService(this)
    this.conversation = new ConversationService(this)
    this.upload = new UploadService(config.baseURL)

    // 初始化重连管理器
    this.reconnectManager = new ReconnectManager(
      {
        maxRetries: config.reconnect?.maxRetries,
        baseDelay: config.reconnect?.baseDelay,
        maxDelay: config.reconnect?.maxDelay,
        jitterFactor: config.reconnect?.jitterFactor,
      },
      (attempt) => this.handleReconnectAttempt(attempt),
      () => this.handleReconnectFinalFail(),
    )

    // 监听重连事件
    this.reconnectManager.on('reconnecting', (attempt) => {
      this.setConnectionStatus(ConnectionStatusEnum.RECONNECTING)
      this.events.emit('connection:reconnecting', { attempt })
    })

    this.reconnectManager.on('reconnected', () => {
      this.setConnectionStatus(ConnectionStatusEnum.CONNECTED)
      this.circuitBreaker.recordSuccess()
    })

    // 初始化熔断器
    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: config.circuitBreaker?.failureThreshold,
      resetTimeout: config.circuitBreaker?.resetTimeout,
      successThreshold: config.circuitBreaker?.successThreshold,
    })

    // 监听熔断器状态变化
    this.circuitBreaker.onStateChanged(({ from, to }) => {
      logger.info('Realtime', `熔断器状态变化: ${from} -> ${to}`)
      if (to === CircuitState.Open) {
        this.events.emit('connection:circuit-open', undefined)
        // 熔断器打开时停止重连
        if (this.reconnectManager.isRetrying) {
          this.reconnectManager.stop()
        }
        this.setConnectionStatus(ConnectionStatusEnum.FAILED)
      } else if (to === CircuitState.HalfOpen) {
        this.events.emit('connection:circuit-half-open', undefined)
        // 半开状态下尝试重连
        if (!this._isManualClose && this._connectionStatus !== ConnectionStatusEnum.CONNECTED) {
          this.startReconnect()
        }
      }
    })
  }

  /** 获取当前连接状态 */
  get connectionStatus(): ConnectionStatus {
    return this._connectionStatus
  }

  /** 设置连接状态 */
  private setConnectionStatus(status: ConnectionStatus): void {
    if (this._connectionStatus === status) return
    this._connectionStatus = status
    logger.debug('Realtime', `连接状态变化: ${this._connectionStatus} -> ${status}`)
  }

  /** 获取 Hub 连接实例 */
  getHub(): HubConnection {
    if (!this.hub) {
      throw new Error('Hub 未初始化，请先调用 login')
    }
    return this.hub
  }

  /** 获取当前会话 ID */
  getConversationId(): string {
    return this.currentConversationId
  }

  /** 设置当前会话 ID（登录后由外部设置） */
  setConversationId(conversationId: string): void {
    this.currentConversationId = conversationId
  }

  /** 获取配置 */
  getConfig(): RealtimeCoreConfig {
    return this.config
  }

  /** 动态更新 Realtime 服务器地址（用于接收服务端下发的配置） */
  updateRealtimeAddrs(wsUrl: string): void {
    if (wsUrl) this.config.wsAddr = wsUrl
    logger.debug('Realtime', `地址已更新: wsAddr=${wsUrl}`)
  }

  /** 检查是否已连接 */
  async isConnected(): Promise<boolean> {
    if (!this.hub) return false
    return this.hub.state === HubConnectionState.Connected
  }

  /** 登录 — 建立 SignalR 连接 */
  async login(userId: string, token: string): Promise<boolean> {
    if (!this.config.wsAddr) {
      throw new Error('Realtime 服务器地址未配置，请先调用 updateRealtimeAddrs 或在初始化时传入 wsAddr')
    }

    // 检查熔断器状态
    if (!this.circuitBreaker.canAttempt()) {
      const err = new Error('熔断器已打开，暂时无法连接，请稍后再试')
      logger.error('Realtime', err.message)
      this.setConnectionStatus(ConnectionStatusEnum.FAILED)
      this.events.emit('connection:failed', err)
      throw err
    }

    this.setConnectionStatus(ConnectionStatusEnum.CONNECTING)
    this.events.emit('connection:connecting', undefined)

    // 清除主动关闭标志
    this._isManualClose = false

    // 如果已连接且凭证未变，跳过
    if (this.hub && this.hub.state === HubConnectionState.Connected) {
      if (this.currentUserId === userId && this.currentToken === token) {
        logger.debug('Realtime', '已连接且凭证未变，跳过重复登录')
        this.setConnectionStatus(ConnectionStatusEnum.CONNECTED)
        this.circuitBreaker.recordSuccess()
        return true
      }
      logger.debug('Realtime', '检测到新凭证，重新连接')
      try {
        await this.hub.stop()
      } catch (err) {
        logger.warn('Realtime', '重新连接前停止失败（忽略）:', err)
      }
    }

    // 停止之前的重连
    if (this.reconnectManager.isRetrying) {
      this.reconnectManager.stop()
    }

    // SignalR withUrl 需要 http(s):// 协议用于 negotiate，ws(s):// 会导致跳过协商
    const hubUrl = this.config.wsAddr
      .replace(/^ws:\/\//, 'http://')
      .replace(/^wss:\/\//, 'https://')

    // 构建 HubConnection
    this.hub = new HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: () => token,
      })
      .configureLogging(LogLevel.Information)
      .build()

    this.currentUserId = userId
    this.currentToken = token

    // 新 hub 实例需要重新注册监听器
    this.hubListenersRegistered = false
    // 注册 Hub 事件
    this.setupHubListeners(this.hub!)

    // 启动连接
    try {
      await this.hub!.start()
      console.log('[RealtimeClient] SignalR 连接成功, connectionId:', (this.hub as any).connectionId)
      logger.info('Realtime', 'SignalR 连接成功')

      this.setConnectionStatus(ConnectionStatusEnum.CONNECTED)
      this.circuitBreaker.recordSuccess()
      this.reconnectManager.reset()

      // 连接成功即同步完成（SignalR 无需 SDK 式同步）
      this.events.emit('connection:success', undefined)
      this.events.emit('sync:finished', undefined)

      this.startHeartbeat()

      return true
    } catch (err) {
      logger.error('Realtime', 'SignalR 连接失败:', err)
      this.circuitBreaker.recordFailure()
      this.events.emit('connection:failed', err)
      this.events.emit('sync:failed', err)

      // 如果熔断器未打开，启动重连
      if (this.circuitBreaker.canAttempt()) {
        this.startReconnect()
      } else {
        this.setConnectionStatus(ConnectionStatusEnum.FAILED)
      }

      throw err
    }
  }

  /** 登出 */
  async logout(): Promise<void> {
    if (!this.currentUserId) return

    // 设置主动关闭标志，防止断开时触发重连
    this._isManualClose = true

    this.stopHeartbeat()
    this.reconnectManager.stop()

    try {
      if (this.hub) {
        await this.hub.stop()
      }
      logger.info('Realtime', '登出成功')
    } catch (err) {
      logger.error('Realtime', '登出失败:', err)
    } finally {
      this.setConnectionStatus(ConnectionStatusEnum.DISCONNECTED)
      this.currentUserId = ''
      this.currentToken = ''
      this.currentConversationId = ''
    }
  }

  /** 获取当前登录用户 ID */
  getCurrentUserId(): string {
    return this.currentUserId
  }

  /** 启动心跳定时器（间隔从配置读取，默认 15 秒） */
  private startHeartbeat(): void {
    this.stopHeartbeat()
    const interval = this.config.heartbeatInterval ?? 15000
    this.heartbeatTimer = setInterval(() => {
      if (this.hub && this.hub.state === HubConnectionState.Connected) {
        this.hub.invoke('Ping').catch((err) => {
          // 心跳失败只记录日志，不直接断开
          logger.warn('Realtime', '心跳发送失败:', err)
        })
      }
    }, interval)
  }

  /** 停止心跳定时器 */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  /** 启动重连流程 */
  private startReconnect(): void {
    if (this._isManualClose) {
      logger.debug('Realtime', '主动关闭，不触发重连')
      return
    }

    if (this.reconnectManager.isRetrying) {
      logger.debug('Realtime', '重连已在进行中')
      return
    }

    if (!this.circuitBreaker.canAttempt()) {
      logger.warn('Realtime', '熔断器已打开，不启动重连')
      this.setConnectionStatus(ConnectionStatusEnum.FAILED)
      return
    }

    logger.info('Realtime', '启动重连流程')
    this.reconnectManager.start()
  }

  /** 执行单次重连尝试（由 ReconnectManager 回调） */
  private async handleReconnectAttempt(attempt: number): Promise<void> {
    if (!this.hub || this._isManualClose) {
      throw new Error('连接已被主动关闭，取消重连')
    }

    if (!this.circuitBreaker.canAttempt()) {
      throw new Error('熔断器已打开，取消重连')
    }

    logger.info('Realtime', `第 ${attempt} 次重连尝试...`)

    try {
      await this.hub.start()
      logger.info('Realtime', `第 ${attempt} 次重连成功`)

      // 重连成功，清除主动关闭标志
      this._isManualClose = false

      this.setConnectionStatus(ConnectionStatusEnum.CONNECTED)
      this.events.emit('connection:success', undefined)
      this.events.emit('sync:finished', undefined)
      this.startHeartbeat()
    } catch (err) {
      this.circuitBreaker.recordFailure()
      throw err
    }
  }

  /** 重连最终失败回调 */
  private handleReconnectFinalFail(): void {
    logger.error('Realtime', '重连次数耗尽，连接失败')
    this.setConnectionStatus(ConnectionStatusEnum.FAILED)
    const err = new Error('重连次数耗尽，无法建立连接')
    this.events.emit('connection:failed', err)
    this.events.emit('sync:failed', err)
  }

  /** 获取当前登录用户信息（通过 Hub 查询） */
  async getUserInfo(): Promise<UserInfo | null> {
    if (!this.hub || this.hub.state !== HubConnectionState.Connected) return null
    try {
      const data = await this.hub.invoke('GetUserInfo', this.currentUserId)
      if (typeof data === 'string') {
        return mapToUserInfo(JSON.parse(data))
      }
      return mapToUserInfo(data)
    } catch (err) {
      logger.error('Realtime', '获取用户信息失败:', err)
      return null
    }
  }

  /** 注册事件监听（快捷方法） */
  on<E extends RealtimeEventType>(event: E, callback: EventCallback<RealtimeEventMap[E]>): void {
    this.events.on(event, callback)
  }

  /** 移除事件监听（快捷方法） */
  off<E extends RealtimeEventType>(event: E, callback: EventCallback<RealtimeEventMap[E]>): void {
    this.events.off(event, callback)
  }

  /** 销毁客户端实例，清理所有资源 */
  destroy(): void {
    // 设置主动关闭标志，防止断开时触发重连
    this._isManualClose = true

    if (this.hub) {
      try {
        this.hub.stop()
      } catch {
        // ignore
      }
    }

    this.stopHeartbeat()
    this.reconnectManager.stop()
    this.events.clear()
    this.tokenRefresher.stop()
    this.currentUserId = ''
    this.currentToken = ''
    this.currentConversationId = ''
    this.hubListenersRegistered = false
    this.hub = null
    this.setConnectionStatus(ConnectionStatusEnum.DISCONNECTED)
  }

  /** 注册 Hub 事件监听器（仅注册一次） */
  private setupHubListeners(hub: HubConnection): void {
    if (this.hubListenersRegistered) {
      console.warn('[RealtimeClient] setupHubListeners 跳过: hubListenersRegistered 已为 true，新 hub 实例未注册监听器!')
      return
    }
    this.hubListenersRegistered = true
    console.log('[RealtimeClient] setupHubListeners 开始注册 hub 事件监听器 (OnMessage, OnReadReceipt, etc.)')

    // 连接关闭事件
    hub.onclose((error) => {
      console.log('[RealtimeClient] onclose 触发, error:', error?.message || '无', 'isManualClose:', this._isManualClose)
      this.stopHeartbeat()

      if (this._isManualClose) {
        // 主动关闭
        logger.info('Realtime', '连接已主动关闭')
        this.setConnectionStatus(ConnectionStatusEnum.DISCONNECTED)
        return
      }

      if (error) {
        logger.error('Realtime', '连接异常断开:', error)
        this.circuitBreaker.recordFailure()
        this.events.emit('connection:failed', error)

        // 异常断开，启动重连
        if (this.circuitBreaker.canAttempt()) {
          this.startReconnect()
        } else {
          this.setConnectionStatus(ConnectionStatusEnum.FAILED)
        }
      } else {
        logger.info('Realtime', '连接正常关闭')
        this.setConnectionStatus(ConnectionStatusEnum.DISCONNECTED)
      }
    })

    // 服务器 → 客户端事件
    hub.on('OnMessage', (data: unknown) => {
      console.log('[RealtimeClient] OnMessage 收到原始数据:', data)
      const message = this.parseMessage(data)
      if (!message) {
        console.warn('[RealtimeClient] OnMessage 解析消息失败，data:', data)
        return
      }
      console.log('[RealtimeClient] OnMessage 解析成功:', {
        clientMsgID: message.clientMsgID,
        sendID: message.sendID,
        contentType: message.contentType,
        content: message.content,
        conversationID: message.conversationID,
      })

      this.events.emit('message:received:raw', message)

      const isSys = isSystemMessage(message)
      const isDisplayable = isDisplayableSystemMessage(message)
      if (!isSys || isDisplayable) {
        console.log('[RealtimeClient] 发出 message:received 事件, isSys:', isSys, 'isDisplayable:', isDisplayable)
        this.events.emit('message:received', message)
      } else {
        console.log('[RealtimeClient] 消息被过滤(系统消息且不可显示), contentType:', message.contentType)
      }
    })

    hub.on('OnReadReceipt', (data: unknown) => {
      const receipts = this.parseData<ReadReceiptInfo[]>(data)
      this.events.emit('message:read-receipt', Array.isArray(receipts) ? receipts : receipts ? [receipts] : [])
    })

    // 送达回执
    hub.on('OnDeliveryReceipt', (data: unknown) => {
      const receipt = this.parseData<DeliveryReceiptInfo>(data)
      if (receipt && receipt.conversationId !== undefined) {
        this.events.emit('message:delivered', receipt)
      }
    })

    // 消息撤回
    hub.on('OnMessageWithdrawn', (data: unknown) => {
      const raw = this.parseData<any>(data)
      if (!raw) return
      const conversationId = raw.conversationId ?? raw.ConversationId ?? ''
      const seq = raw.seq ?? raw.Seq ?? 0
      const message = raw.message ? mapToMessage(raw.message) ?? undefined : undefined
      const info: MessageWithdrawnInfo = { conversationId, seq, message }
      this.events.emit('message:withdrawn', info)
    })

    // 消息编辑
    hub.on('OnMessageEdited', (data: unknown) => {
      const message = this.parseMessage(data)
      if (message) {
        this.events.emit('message:edited', message)
      }
    })

    // 消息删除
    hub.on('OnMessageDeleted', (data: unknown) => {
      const raw = this.parseData<any>(data)
      if (!raw) return
      const conversationId = raw.conversationId ?? raw.ConversationId ?? ''
      const seq = raw.seq ?? raw.Seq ?? 0
      const info: MessageDeletedInfo = { conversationId, seq }
      this.events.emit('message:deleted', info)
    })

    hub.on('OnConversationChanged', (data: unknown) => {
      const rawArr = Array.isArray(data) ? data : data ? [data] : []
      const conversations = mapToConversationList(rawArr)
      if (conversations.length > 0) {
        this.events.emit('conversation:changed', conversations)
      }
    })

    hub.on('OnKicked', () => {
      logger.warn('Realtime', '被踢下线')
      // 被踢下线视为主动断开，不触发重连
      this._isManualClose = true
      this.reconnectManager.stop()
      this.stopHeartbeat()
      this.setConnectionStatus(ConnectionStatusEnum.DISCONNECTED)
      this.events.emit('kicked:offline', undefined)
    })

    hub.on('OnTokenExpired', () => {
      logger.warn('Realtime', 'Token 已过期')
      this.events.emit('token:expired', undefined)
    })

    // 新会话通知（后端在创建会话后推送到 agent:{userId} 个人组）
    hub.on('OnNewConversation', (data: unknown) => {
      const raw = this.parseData<any>(data)
      if (!raw) return
      const conversationId = raw.conversationId ?? raw.ConversationId ?? ''
      const visitorName = raw.visitorName ?? raw.VisitorName ?? ''
      logger.info('Realtime', '收到新会话通知:', conversationId, visitorName)
      this.events.emit('conversation:new', { conversationId, visitorName })
    })
  }

  /** 解析消息数据（自动映射 C# RealtimeMessage → JS Message） */
  private parseMessage(data: unknown): Message | null {
    if (!data) return null
    if (typeof data === 'string') {
      try {
        return mapToMessage(JSON.parse(data))
      } catch {
        return null
      }
    }
    return mapToMessage(data)
  }

  /** 通用数据解析 */
  private parseData<T>(data: unknown): T {
    if (typeof data === 'string') {
      try {
        return JSON.parse(data) as T
      } catch {
        return data as T
      }
    }
    return data as T
  }
}
