import logger from '../utils/logger'

/** 重连管理器配置 */
export interface ReconnectManagerOptions {
  /** 最大重试次数，默认 10 */
  maxRetries?: number
  /** 基础延迟（毫秒），默认 1000 */
  baseDelay?: number
  /** 最大延迟（毫秒），默认 30000 */
  maxDelay?: number
  /** 抖动因子（0~1），默认 0.2 */
  jitterFactor?: number
  /** 是否使用指数退避，默认 true */
  useExponentialBackoff?: boolean
}

/** 重连事件类型 */
export type ReconnectEvent = 'reconnecting' | 'reconnected' | 'failed'

/** 重连事件回调 */
export type ReconnectEventCallback = (attempt: number) => void

/**
 * 重连管理器
 * 实现指数退避 + 抖动算法，与 C# RetryUtil 算法一致
 */
export class ReconnectManager {
  private readonly maxRetries: number
  private readonly baseDelay: number
  private readonly maxDelay: number
  private readonly jitterFactor: number
  private readonly useExponentialBackoff: boolean

  private _currentAttempt = 0
  private _isRetrying = false
  private retryTimer: ReturnType<typeof setTimeout> | null = null
  private stopped = false

  private readonly onReconnect: (attempt: number) => Promise<void>
  private readonly onFinalFail: () => void
  private readonly eventListeners: Map<ReconnectEvent, Set<ReconnectEventCallback>> = new Map()

  constructor(
    options: ReconnectManagerOptions,
    onReconnect: (attempt: number) => Promise<void>,
    onFinalFail: () => void,
  ) {
    this.maxRetries = options.maxRetries ?? 10
    this.baseDelay = options.baseDelay ?? 1000
    this.maxDelay = options.maxDelay ?? 30000
    this.jitterFactor = options.jitterFactor ?? 0.2
    this.useExponentialBackoff = options.useExponentialBackoff ?? true

    this.onReconnect = onReconnect
    this.onFinalFail = onFinalFail
  }

  /** 当前重试次数 */
  get currentAttempt(): number {
    return this._currentAttempt
  }

  /** 是否正在重连中 */
  get isRetrying(): boolean {
    return this._isRetrying
  }

  /** 注册事件监听 */
  on(event: ReconnectEvent, callback: ReconnectEventCallback): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set())
    }
    this.eventListeners.get(event)!.add(callback)
  }

  /** 移除事件监听 */
  off(event: ReconnectEvent, callback: ReconnectEventCallback): void {
    const set = this.eventListeners.get(event)
    if (set) {
      set.delete(callback)
    }
  }

  /** 触发事件 */
  private emit(event: ReconnectEvent, attempt: number): void {
    const set = this.eventListeners.get(event)
    if (set) {
      set.forEach((cb) => cb(attempt))
    }
  }

  /**
   * 计算下次重试延迟
   * 指数退避 + 抖动算法
   */
  private calculateDelay(attempt: number): number {
    let delay: number

    if (this.useExponentialBackoff) {
      // 指数退避：baseDelay * 2^attempt
      delay = this.baseDelay * Math.pow(2, attempt)
    } else {
      // 线性退避：baseDelay * (attempt + 1)
      delay = this.baseDelay * (attempt + 1)
    }

    // 限制最大延迟
    delay = Math.min(delay, this.maxDelay)

    // 抖动：在 delay 基础上 ±jitterFactor 范围内随机
    const jitter = delay * this.jitterFactor * (Math.random() * 2 - 1)
    delay = delay + jitter

    // 确保延迟至少为 0
    return Math.max(0, Math.floor(delay))
  }

  /** 开始重连流程 */
  start(): void {
    if (this._isRetrying) {
      logger.warn('ReconnectManager', '重连已在进行中，忽略重复调用')
      return
    }

    this._isRetrying = true
    this.stopped = false
    this._currentAttempt = 0

    logger.info('ReconnectManager', `开始重连流程，最大重试次数: ${this.maxRetries}`)
    this.scheduleNextRetry()
  }

  /** 安排下一次重试 */
  private scheduleNextRetry(): void {
    if (this.stopped) return

    if (this._currentAttempt >= this.maxRetries) {
      logger.error('ReconnectManager', `已达到最大重试次数 ${this.maxRetries}，重连失败`)
      this._isRetrying = false
      this.emit('failed', this._currentAttempt)
      this.onFinalFail()
      return
    }

    const delay = this.calculateDelay(this._currentAttempt)
    const attempt = this._currentAttempt + 1

    logger.info('ReconnectManager', `第 ${attempt} 次重连将在 ${delay}ms 后执行`)

    this.emit('reconnecting', attempt)

    this.retryTimer = setTimeout(async () => {
      if (this.stopped) return

      this._currentAttempt = attempt

      try {
        await this.onReconnect(attempt)
        // 重连成功
        logger.info('ReconnectManager', `第 ${attempt} 次重连成功`)
        this._isRetrying = false
        this.emit('reconnected', attempt)
      } catch (err) {
        logger.warn('ReconnectManager', `第 ${attempt} 次重连失败:`, err)
        // 重连失败，继续下一次
        this.scheduleNextRetry()
      }
    }, delay)
  }

  /** 停止重连（主动关闭时调用） */
  stop(): void {
    this.stopped = true
    this._isRetrying = false

    if (this.retryTimer) {
      clearTimeout(this.retryTimer)
      this.retryTimer = null
    }

    logger.debug('ReconnectManager', '重连已停止')
  }

  /** 重置重试计数（连接成功后调用） */
  reset(): void {
    this._currentAttempt = 0
    this._isRetrying = false
    this.stopped = false

    if (this.retryTimer) {
      clearTimeout(this.retryTimer)
      this.retryTimer = null
    }

    logger.debug('ReconnectManager', '重连计数器已重置')
  }
}
