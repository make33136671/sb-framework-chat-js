import type { Conversation } from '../types/conversation'
import type { Message } from '../types/message'
import { MessageParser } from '../message/MessageParser'
import { mapToConversation, mapToConversationList, mapToMessage } from '../message/RealtimeMessageMapper'
import logger from '../utils/logger'
import type { HubConnection } from '@microsoft/signalr'

/** RealtimeClient 接口（避免循环依赖） */
interface IRealtimeClient {
  getHub(): HubConnection
  getConversationId(): string
}

/** 会话服务（基于 SignalR Hub） */
export class ConversationService {
  private client: IRealtimeClient

  constructor(client: IRealtimeClient) {
    this.client = client
  }

  /** 获取会话列表 */
  async getList(count: number = 100): Promise<Conversation[]> {
    const hub = this.client.getHub()
    try {
      const result = await hub.invoke('GetConversationList', count)
      return mapToConversationList(result)
    } catch (err) {
      logger.error('Conversation', '获取会话列表失败:', err)
      return []
    }
  }

  /** 根据用户 ID 获取单个会话 */
  async getOne(userID: string, sessionType: number = 1): Promise<Conversation | null> {
    const hub = this.client.getHub()
    try {
      console.log('[ConversationService] getOne 调用, userID:', userID, 'sessionType:', sessionType)
      const result = await hub.invoke('GetOneConversation', userID, sessionType)
      const conv = mapToConversation(result)
      console.log('[ConversationService] getOne 结果:', conv ? { conversationID: conv.conversationID, showName: conv.showName } : 'null')
      return conv
    } catch (err) {
      console.error('[ConversationService] getOne 失败:', err)
      logger.error('Conversation', '获取会话失败:', err)
      return null
    }
  }

  /** 加入会话组（接收该会话的实时消息推送） */
  async joinConversation(conversationId: string): Promise<void> {
    const hub = this.client.getHub()
    try {
      console.log('[ConversationService] joinConversation 调用, conversationId:', conversationId)
      await hub.invoke('JoinConversation', conversationId)
      console.log('[ConversationService] joinConversation 成功, 已加入 conv:' + conversationId + ' 组')
    } catch (err) {
      console.error('[ConversationService] joinConversation 失败:', err)
      logger.error('Conversation', '加入会话组失败:', err)
    }
  }

  /** 离开会话组 */
  async leaveConversation(conversationId: string): Promise<void> {
    const hub = this.client.getHub()
    try {
      await hub.invoke('LeaveConversation', conversationId)
    } catch (err) {
      logger.error('Conversation', '离开会话组失败:', err)
    }
  }

  /** 获取历史消息 */
  async getHistory(
    conversationID: string,
    count: number = 20,
    startClientMsgID: string = ''
  ): Promise<Message[]> {
    const hub = this.client.getHub()
    try {
      const beforeId = startClientMsgID ? parseInt(startClientMsgID, 10) || 0 : 0
      console.log('[ConversationService] getHistory 调用, conversationID:', conversationID, 'beforeId:', beforeId, 'count:', count)
      const result = await hub.invoke('GetHistory', conversationID, beforeId, count)
      const rawArr = Array.isArray(result) ? result : []
      const messages = rawArr.map((r: unknown) => mapToMessage(r)).filter((m): m is Message => m !== null)
      console.log('[ConversationService] getHistory 返回, 消息数量:', messages.length, '(服务端会自动加入 conv:' + conversationID + ' 组)')
      return messages.length > 0 ? messages : MessageParser.parse<Message[]>(result) || []
    } catch (err) {
      console.error('[ConversationService] getHistory 失败:', err)
      logger.error('Conversation', '获取历史消息失败:', err)
      return []
    }
  }

  /** 标记会话消息已读 */
  async markAsRead(conversationID: string): Promise<void> {
    const hub = this.client.getHub()
    try {
      await hub.invoke('MarkRead', conversationID, 0)
      logger.debug('Conversation', '标记已读成功:', conversationID)
    } catch (err) {
      logger.error('Conversation', '标记已读失败:', err)
    }
  }
}
