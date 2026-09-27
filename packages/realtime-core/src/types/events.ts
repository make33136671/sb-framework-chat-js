import type { Message } from './message'
import type { Conversation } from './conversation'

/** C2C 已读回执信息 */
export interface ReadReceiptInfo {
  userID: string
  msgIDList: string[]
  readTime: number
  sessionType: number
}

/** 送达回执信息 */
export interface DeliveryReceiptInfo {
  conversationId: string
  userId: string
  seq: number
}

/** 消息撤回事件数据 */
export interface MessageWithdrawnInfo {
  conversationId: string
  seq: number
  message?: Message
}

/** 消息删除事件数据 */
export interface MessageDeletedInfo {
  conversationId: string
  seq: number
}

/** 事件类型（冒号分隔） */
export type RealtimeEventType =
  | 'connection:connecting'
  | 'connection:success'
  | 'connection:failed'
  | 'connection:reconnecting'
  | 'connection:circuit-open'
  | 'connection:circuit-half-open'
  | 'kicked:offline'
  | 'token:expired'
  | 'sync:finished'
  | 'sync:failed'
  | 'message:received'
  | 'message:received:raw'
  | 'message:read-receipt'
  | 'message:delivered'
  | 'message:withdrawn'
  | 'message:edited'
  | 'message:deleted'
  | 'conversation:changed'
  | 'conversation:new'

/** 事件数据映射 */
export interface RealtimeEventMap {
  'connection:connecting': undefined
  'connection:success': undefined
  'connection:failed': unknown
  'connection:reconnecting': { attempt: number }
  'connection:circuit-open': undefined
  'connection:circuit-half-open': undefined
  'kicked:offline': undefined
  'token:expired': undefined
  'sync:finished': undefined
  'sync:failed': unknown
  'message:received': Message
  'message:received:raw': Message
  'message:read-receipt': ReadReceiptInfo[]
  'message:delivered': DeliveryReceiptInfo
  'message:withdrawn': MessageWithdrawnInfo
  'message:edited': Message
  'message:deleted': MessageDeletedInfo
  'conversation:changed': Conversation[]
  'conversation:new': { conversationId: string; visitorName?: string }
}

/** 事件回调函数 */
export type EventCallback<T = unknown> = (data: T) => void
