/** 平台类型枚举 */
export const PlatformType = {
  Web: 0,
  iOS: 1,
  Android: 2,
  Windows: 3,
  MacOS: 4,
  Linux: 5,
} as const

export type PlatformType = (typeof PlatformType)[keyof typeof PlatformType]

/** 聊天用户类型枚举 */
export const ChatUserType = {
  Anonymous: 0,
  Authenticated: 1,
  VIP: 2,
} as const

export type ChatUserType = (typeof ChatUserType)[keyof typeof ChatUserType]

/** 客服在线状态枚举 */
export const KefuOnlineStatus = {
  Offline: 0,
  Online: 1,
  Busy: 2,
  Away: 3,
} as const

export type KefuOnlineStatus = (typeof KefuOnlineStatus)[keyof typeof KefuOnlineStatus]

/** 获取 Token 请求参数 */
export interface GetTokenRequest {
  platformKey: string
  deviceId?: string
  userId?: string
  clientId?: string
  nickname?: string
  avatar?: string
  metadata?: string
  platformType?: PlatformType
  deviceInfo?: string
  /** 接入来源标识：js | vue | chat */
  source?: string
}

/** 聊天用户资料 */
export interface ChatUserProfile {
  userId: string
  userType: ChatUserType
  isNewUser: boolean
  nickname: string
  avatar: string
  externalUserId?: string
  deviceId?: string
  firstVisitTime?: string
  tags?: string[]
  metadata?: Record<string, string>
}

/** 分配的客服信息 */
export interface AssignedAgentInfo {
  agentUserId: string
  nickname: string
  avatar: string
  onlineStatus: KefuOnlineStatus
  isOnline: boolean
  welcomeMessage?: string
  autoSendWelcome: boolean
  /** 预计算的 Realtime 会话 ID */
  conversationId?: string
  /** 会话群组 ID（统一群聊模式） */
  groupId?: string
}

/** 平台配置信息 */
export interface PlatformConfigInfo {
  platformId: number
  platformName: string
  domain?: string
  logo?: string
  offlineMessage?: string
  allowOfflineMessage: boolean
  isWorkingHours: boolean
  nonWorkingMessage?: string
}

/** 功能开关 */
export interface FeatureFlags {
  allowImage: boolean
  allowFile: boolean
  allowVoice: boolean
  showOnlineStatus: boolean
  showReadStatus: boolean
  enableSatisfactionRating: boolean
  enableVisitorForm: boolean
  enableQueue: boolean
  enableBroadcast: boolean
}

/** 访客表单字段 */
export interface VisitorFormField {
  key: string
  label: string
  type: 'text' | 'email' | 'phone' | 'select' | 'textarea'
  required: boolean
  placeholder?: string
  options?: string[]
}

/** 访客表单配置 */
export interface VisitorFormConfig {
  formId: number
  formName: string
  formFields: VisitorFormField[]
  isRequired: boolean
}

/** 排队信息 */
export interface QueueInfo {
  isQueued: boolean
  position: number
  totalWaiting: number
  estimatedWaitMinutes: number
}

/** Realtime 连接配置（服务端下发） */
export interface RealtimeConfig {
  /** API 基础地址 */
  apiUrl: string
  /** Realtime Hub WebSocket 地址 */
  wsUrl: string
}

/** 获取 Token 响应 */
export interface GetTokenResponse {
  userID: string
  token: string
  expireTime: number
  user: ChatUserProfile
  agent: AssignedAgentInfo | null
  platform: PlatformConfigInfo | null
  features: FeatureFlags
  /** 排队信息（当并发会话超限时返回） */
  queue?: QueueInfo
  /** 访客表单配置（启用时返回） */
  visitorForm?: VisitorFormConfig
  /** Realtime 连接配置（服务端下发） */
  realtimeConfig?: RealtimeConfig
}

/** 通用 API 响应 */
export interface ApiResponse<T = unknown> {
  code: number
  message: string
  type?: string
  data: T
}

/** 更新用户信息请求 */
export interface UpdateUserInfoRequest {
  platformKey: string
  deviceId: string
  userId?: string
  nickname?: string
  avatar?: string
}
