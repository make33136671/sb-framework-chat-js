import type { Message } from '../types/message'
import { MessageType } from '../types/message'
import { MessageParser } from './MessageParser'
import { mapToMessage } from './RealtimeMessageMapper'
import { isSystemMessage, SystemMsg } from './SystemMessage'
import { MessageTypeRegistry } from './MessageTypeRegistry'
import logger from '../utils/logger'
import type { HubConnection } from '@microsoft/signalr'

/** RealtimeClient 接口（避免循环依赖） */
interface IRealtimeClient {
  getHub(): HubConnection
  getConversationId(): string
  getCurrentUserId(): string
}

/** 消息收发服务（基于 SignalR Hub） */
export class MessageService {
  private client: IRealtimeClient

  /** 前端消息类型注册表 */
  readonly types: MessageTypeRegistry

  constructor(client: IRealtimeClient) {
    this.client = client
    this.types = new MessageTypeRegistry()
  }

  /** 判断是否为系统消息（静态方法，供外部调用） */
  static isSystemMessage(message: Message): boolean {
    return isSystemMessage(message)
  }

  /** 发送文本消息 */
  async sendText(_recvID: string, text: string, _isGroup: boolean = false): Promise<Message> {
    const hub = this.client.getHub()
    const conversationId = this.client.getConversationId()
    console.log('[MessageService] sendText 调用, conversationId:', conversationId, 'text:', text)
    if (!conversationId) {
      throw new Error('会话 ID 为空，无法发送消息。请先通过 setConversationId 设置会话 ID。')
    }
    try {
      const payload = JSON.stringify({ content: text })
      const result = await hub.invoke('SendMessage', conversationId, MessageType.TextMessage, payload)
      console.log('[MessageService] sendText 服务端返回:', result)
      const mapped = mapToMessage(result)
      if (!mapped) {
        logger.warn('Message', 'SendMessage 返回 null，可能是 conversationId 无效')
        throw new Error('消息发送失败：服务端未返回消息对象')
      }
      console.log('[MessageService] sendText 映射成功, clientMsgID:', mapped.clientMsgID)
      return mapped
    } catch (err) {
      console.error('[MessageService] sendText 失败:', err)
      logger.error('Message', '发送消息失败:', err)
      throw err
    }
  }

  /** 发送图片消息 */
  async sendImage(
    _recvID: string,
    _file: File,
    imageUrl: string,
    imageInfo: { width: number; height: number; size: number; type: string },
    _isGroup: boolean = false
  ): Promise<Message> {
    const hub = this.client.getHub()
    const conversationId = this.client.getConversationId()
    try {
      const payload = JSON.stringify({
        type: 'image',
        url: imageUrl,
        width: imageInfo.width,
        height: imageInfo.height,
        size: imageInfo.size,
      })
      const result = await hub.invoke('SendMessage', conversationId, MessageType.PictureMessage, payload)
      return mapToMessage(result) ?? MessageParser.parse<Message>(result)
    } catch (err) {
      logger.error('Message', '发送图片失败:', err)
      throw err
    }
  }

  /** 发送自定义消息 */
  async sendCustomMessage(
    _recvID: string,
    data: string,
    extension: string,
    description: string
  ): Promise<Message> {
    const hub = this.client.getHub()
    const conversationId = this.client.getConversationId()
    try {
      const payload = JSON.stringify({ data, extension, description })
      const result = await hub.invoke('SendMessage', conversationId, MessageType.CustomMessage, payload)
      return mapToMessage(result) ?? MessageParser.parse<Message>(result)
    } catch (err) {
      logger.error('Message', '发送自定义消息失败:', err)
      throw err
    }
  }

  /** 发送系统消息（通用） */
  async sendSystemMessage(
    type: string,
    data: Record<string, unknown>
  ): Promise<void> {
    const hub = this.client.getHub()
    const conversationId = this.client.getConversationId()
    try {
      const payload = JSON.stringify({ ...data, type, timestamp: Date.now() })
      await hub.invoke('SendSystemMessage', conversationId, type, payload)
    } catch (err) {
      logger.error('Message', `发送系统消息(${type})失败:`, err)
    }
  }

  /** 发送用户信息更新系统消息 */
  async sendUserInfoUpdated(
    _agentUserID: string,
    updates: { nickname?: string; avatar?: string; userId?: string },
    previousValues?: { nickname?: string; avatar?: string; userId?: string }
  ): Promise<void> {
    await this.sendSystemMessage(SystemMsg.UserInfoUpdated, { updates, previousValues })
  }

  /** 发送会话初始化系统消息 */
  async sendSessionInit(
    _agentUserID: string,
    info: {
      visitorId: string
      platformKey: string
      reason: 'login' | 'reconnect' | 'refresh'
    }
  ): Promise<void> {
    await this.sendSystemMessage(SystemMsg.SessionInit, info)
  }

  /** 发送访客离线系统消息 */
  async sendVisitorOffline(
    _agentUserID: string,
    info: {
      visitorId: string
      reason: string
      sessionDuration?: number
    }
  ): Promise<void> {
    await this.sendSystemMessage(SystemMsg.VisitorOffline, info)
  }

  /** 发送访客上线系统消息 */
  async sendVisitorOnline(
    _agentUserID: string,
    visitorInfo: {
      visitorId: string
      deviceId: string
      nickname: string
      avatar: string
      isAnonymous: boolean
      userType?: number
      source: string
      platformType: number
      metadata?: Record<string, unknown>
      pageUrl?: string
      pageTitle?: string
      referrer?: string
    }
  ): Promise<void> {
    await this.sendSystemMessage(SystemMsg.VisitorOnline, visitorInfo)
  }

  // —— 送达 / 已读回执 ——

  /**
   * 上报消息送达（AcknowledgeDelivery）
   * @param conversationId 会话 ID
   * @param seq 消息序号
   */
  async acknowledgeDelivery(conversationId: string, seq: number): Promise<void> {
    const hub = this.client.getHub()
    try {
      await hub.invoke('AcknowledgeDelivery', conversationId, seq)
    } catch (err) {
      logger.error('Message', `上报送达失败(conversationId=${conversationId}, seq=${seq}):`, err)
      throw err
    }
  }

  /**
   * 上报消息已读（AcknowledgeRead）
   * @param conversationId 会话 ID
   * @param lastReadSeq 最后已读消息序号
   */
  async acknowledgeRead(conversationId: string, lastReadSeq: number): Promise<void> {
    const hub = this.client.getHub()
    try {
      await hub.invoke('AcknowledgeRead', conversationId, lastReadSeq)
    } catch (err) {
      logger.error('Message', `上报已读失败(conversationId=${conversationId}, lastReadSeq=${lastReadSeq}):`, err)
      throw err
    }
  }

  // —— 消息撤回 / 编辑 / 删除 ——

  /**
   * 撤回消息（WithdrawMessage）
   * @param conversationId 会话 ID
   * @param seq 消息序号
   * @returns 撤回后的消息对象（status=Withdrawn），失败返回 null
   */
  async withdraw(conversationId: string, seq: number): Promise<Message | null> {
    const hub = this.client.getHub()
    try {
      const result = await hub.invoke('WithdrawMessage', conversationId, seq)
      return mapToMessage(result)
    } catch (err) {
      logger.error('Message', `撤回消息失败(conversationId=${conversationId}, seq=${seq}):`, err)
      throw err
    }
  }

  /**
   * 编辑消息（EditMessage）
   * @param conversationId 会话 ID
   * @param seq 消息序号
   * @param newContent 新内容
   * @returns 编辑后的消息对象（status=Edited），失败返回 null
   */
  async edit(conversationId: string, seq: number, newContent: string): Promise<Message | null> {
    const hub = this.client.getHub()
    try {
      const result = await hub.invoke('EditMessage', conversationId, seq, newContent)
      return mapToMessage(result)
    } catch (err) {
      logger.error('Message', `编辑消息失败(conversationId=${conversationId}, seq=${seq}):`, err)
      throw err
    }
  }

  /**
   * 删除消息（DeleteMessage）
   * @param conversationId 会话 ID
   * @param seq 消息序号
   */
  async deleteMessage(conversationId: string, seq: number): Promise<void> {
    const hub = this.client.getHub()
    try {
      await hub.invoke('DeleteMessage', conversationId, seq)
    } catch (err) {
      logger.error('Message', `删除消息失败(conversationId=${conversationId}, seq=${seq}):`, err)
      throw err
    }
  }
}
