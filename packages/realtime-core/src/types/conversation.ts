/** 会话对象 */
export interface Conversation {
  conversationID: string
  conversationType: number
  userID: string
  groupID: string
  showName: string
  faceURL: string
  recvMsgOpt: number
  unreadCount: number
  latestMsg: string
  latestMsgSendTime: number
  draftText: string
  draftTextTime: number
  isPinned: boolean
  isPrivateChat: boolean
}

/** 用户信息 */
export interface UserInfo {
  userID: string
  nickname: string
  faceURL: string
  createTime: number
  ex: string
}

/** 连接状态枚举 */
export const ConnectionStatus = {
  CONNECTING: 0,
  CONNECTED: 1,
  DISCONNECTED: 2,
  FAILED: 3,
  RECONNECTING: 4,
} as const

export type ConnectionStatus = (typeof ConnectionStatus)[keyof typeof ConnectionStatus]
