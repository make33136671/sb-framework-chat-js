import { RealtimeClient } from './client/RealtimeClient'
import type { RealtimeCoreConfig } from './types/config'

// --- 核心类 ---
export { RealtimeClient } from './client/RealtimeClient'
export { EventManager } from './client/EventManager'
export { ReconnectManager } from './client/ReconnectManager'
export type { ReconnectManagerOptions, ReconnectEvent, ReconnectEventCallback } from './client/ReconnectManager'
export { CircuitBreaker, CircuitState } from './client/CircuitBreaker'
export type { CircuitBreakerOptions, CircuitStateChangedData } from './client/CircuitBreaker'

// --- 服务 ---
export { AuthService } from './auth/AuthService'
export { SessionManager } from './auth/SessionManager'
export { TokenRefresher } from './auth/TokenRefresher'
export { MessageService } from './message/MessageService'
export { MessageParser } from './message/MessageParser'
export {
  isSystemMessage,
  isDisplayableSystemMessage,
  getSystemMessageType,
  getSystemMessageLabel,
  getMessagePreview,
  classifyMessage,
  SYSTEM_MESSAGE_TYPES,
  SystemMsg,
  type MessageClassification,
} from './message/SystemMessage'
export { ConversationService } from './conversation/ConversationService'
export { UploadService } from './upload/UploadService'
export { mapToMessage, mapToConversation, mapToConversationList, mapToUserInfo } from './message/RealtimeMessageMapper'

// --- 消息类型注册 ---
export { MessageTypeRegistry } from './message/MessageTypeRegistry'
export type { MessageTypeRenderer, MessageTypeHandler } from './message/MessageTypeRegistry'

// --- 类型 ---
export {
  MessageStatus,
  MessageType,
  type TextElement,
  type Picture,
  type PictureElem,
  type CustomElem,
  type CustomImageData,
  type Message,
} from './types/message'

export {
  ConnectionStatus,
  type Conversation,
  type UserInfo,
} from './types/conversation'

export {
  PlatformType,
  ChatUserType,
  KefuOnlineStatus,
  type GetTokenRequest,
  type ChatUserProfile,
  type AssignedAgentInfo,
  type PlatformConfigInfo,
  type FeatureFlags,
  type GetTokenResponse,
  type ApiResponse,
  type UpdateUserInfoRequest,
  type QueueInfo,
  type VisitorFormField,
  type VisitorFormConfig,
  type RealtimeConfig,
} from './types/auth'

export type { RealtimeCoreConfig } from './types/config'
export type {
  RealtimeEventType,
  RealtimeEventMap,
  EventCallback,
  ReadReceiptInfo,
  DeliveryReceiptInfo,
} from './types/events'

// --- 工具 ---
export { getClientId, resetClientId, hasClientId } from './utils/clientId'
export { collectDeviceInfo, type ClientDeviceInfo } from './utils/deviceInfo'
export { default as logger, setLogLevel, getLogLevel } from './utils/logger'

// --- 插件接口（预留） ---
export type { RealtimePlugin } from './plugins/PluginInterface'

// --- 上传类型 ---
export type { UploadResponse } from './upload/UploadService'

/** 创建 Realtime 核心客户端实例（工厂函数） */
export function createRealtimeCore(config: RealtimeCoreConfig): RealtimeClient {
  return new RealtimeClient(config)
}
