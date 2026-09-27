/** 消息状态枚举（8 态） */
export const MessageStatus = {
  Sending: 1,
  Sent: 2,
  /** @deprecated 请使用 MessageStatus.Sent，值相同，向后兼容 */
  Success: 2,
  Delivered: 3,
  Read: 4,
  Failed: 5,
  Withdrawn: 6,
  Edited: 7,
  Deleted: 8,
} as const

export type MessageStatus = (typeof MessageStatus)[keyof typeof MessageStatus]

/** 消息类型枚举（数字类型 + 命名空间字符串类型） */
export const MessageType = {
  // —— 数字类型 ——
  TextMessage: 101,
  PictureMessage: 102,
  VoiceMessage: 103,
  VideoMessage: 104,
  FileMessage: 105,
  AtTextMessage: 106,
  MergeMessage: 107,
  CardMessage: 108,
  LocationMessage: 109,
  CustomMessage: 110,
  TypingMessage: 113,
  QuoteMessage: 114,
  FaceMessage: 115,

  // —— 命名空间字符串类型 ——
  // 系统消息
  SystemNotice: 'system.notice',
  SystemMember: 'system.member',
  SystemMute: 'system.mute',
  // 通话消息
  CallVoice: 'call.voice',
  CallVideo: 'call.video',
  CallMissed: 'call.missed',
  // 互动消息
  InteractPoke: 'interact.poke',
  InteractShake: 'interact.shake',
  InteractFlash: 'interact.flash',
} as const

export type MessageType = (typeof MessageType)[keyof typeof MessageType]

/** 文本消息元素 */
export interface TextElement {
  content: string
}

/** 图片基础信息 */
export interface Picture {
  uuid: string
  type: string
  size: number
  width: number
  height: number
  url: string
}

/** 图片消息元素 */
export interface PictureElem {
  sourcePath: string
  sourcePicture: Picture
  bigPicture: Picture
  snapshotPicture: Picture
}

/** 自定义消息元素 */
export interface CustomElem {
  data: string
  extension: string
  description: string
}

/** 自定义图片消息数据 */
export interface CustomImageData {
  type: 'image'
  url: string
  width: number
  height: number
  size: number
}

/** 消息对象 */
export interface Message {
  clientMsgID: string
  serverMsgID: string
  createTime: number
  sendTime: number
  sendID: string
  recvID: string
  msgFrom: number
  contentType: MessageType | number | string
  senderNickname: string
  senderFaceUrl: string
  content: string
  textElem?: TextElement
  pictureElem?: PictureElem
  customElem?: CustomElem
  conversationID: string
  isRead: boolean
  /** 消息状态（对应 MessageStatus） */
  status: number
  /** 送达时间（ISO 字符串） */
  deliveredAt?: string
  /** 已读时间（ISO 字符串） */
  readAt?: string
  /** 编辑时间（ISO 字符串） */
  editedAt?: string
  /** 编辑前内容 */
  previousContent?: string
  /** 撤回标记（与 status=Withdrawn 同步） */
  isWithdrawn?: boolean
}
