import type { Message } from '../types/message'
import { MessageType } from '../types/message'

/**
 * 系统消息类型常量 — 与 C# SystemMessageTypes.cs 对齐
 *
 * 系统消息使用 contentType=110 (CustomMessage)，
 * data.type 标识具体类型，extension 包含 {systemMessage:true, notDisplay:true}。
 */
export const SystemMsg = {
  SessionInit: 'session_init',
  VisitorOnline: 'visitor_online',
  VisitorOffline: 'visitor_offline',
  UserInfoUpdated: 'user_info_updated',
  MessageRead: 'message_read',
} as const

export type SystemMessageType = (typeof SystemMsg)[keyof typeof SystemMsg]

/** 所有系统消息类型值数组（用于 isSystemMessage 判断） */
export const SYSTEM_MESSAGE_TYPES = Object.values(SystemMsg)

/** 系统消息类型 → 显示文本映射 */
const SYSTEM_MSG_LABELS: Record<string, string> = {
  [SystemMsg.VisitorOnline]: '客户已上线',
  [SystemMsg.VisitorOffline]: '客户已离线',
  [SystemMsg.UserInfoUpdated]: '客户更新用户信息',
  [SystemMsg.SessionInit]: '会话已建立',
  [SystemMsg.MessageRead]: '对方已读',
}

/** 判断消息是否为系统消息 */
export function isSystemMessage(message: Message): boolean {
  if (Number(message.contentType) !== MessageType.CustomMessage) return false
  if (!message.customElem?.data) return false

  try {
    const data = JSON.parse(message.customElem.data)
    return (SYSTEM_MESSAGE_TYPES as readonly string[]).includes(data.type)
  } catch {
    return false
  }
}

/** 从消息中提取系统消息类型，非系统消息返回 null */
export function getSystemMessageType(message: Message): SystemMessageType | null {
  if (Number(message.contentType) !== MessageType.CustomMessage) return null
  if (!message.customElem?.data) return null
  try {
    const data = JSON.parse(message.customElem.data)
    if ((SYSTEM_MESSAGE_TYPES as readonly string[]).includes(data.type)) {
      return data.type as SystemMessageType
    }
    return null
  } catch {
    return null
  }
}

/** 获取系统消息的显示文本，非系统消息或 session_init 返回空字符串 */
export function getSystemMessageLabel(message: Message): string {
  const type = getSystemMessageType(message)
  if (!type) return ''
  return SYSTEM_MSG_LABELS[type] || ''
}

/**
 * 判断是否为应在聊天窗口中显示的系统消息
 * session_init 不显示，其余（上线/离线/信息更新）显示
 */
export function isDisplayableSystemMessage(message: Message): boolean {
  const type = getSystemMessageType(message)
  return type !== null && type !== SystemMsg.SessionInit && type !== SystemMsg.MessageRead
}

/**
 * 获取消息的摘要文本（用于会话列表预览）
 */
export function getMessagePreview(message: Message): string {
  const sysType = getSystemMessageType(message)
  if (sysType === SystemMsg.MessageRead) return ''
  const sysLabel = sysType ? (SYSTEM_MSG_LABELS[sysType] || '') : ''
  if (sysLabel) return `[${sysLabel}]`
  if (sysType) return ''

  const ct = Number(message.contentType)
  if (ct === MessageType.TextMessage) {
    if (message.textElem?.content) return message.textElem.content
    try {
      const parsed = JSON.parse(message.content)
      return parsed.content || message.content
    } catch {
      return message.content || ''
    }
  }
  if (ct === MessageType.PictureMessage) return '[图片]'
  if (ct === MessageType.VoiceMessage) return '[语音]'
  if (ct === MessageType.VideoMessage) return '[视频]'
  if (ct === MessageType.FileMessage) return '[文件]'
  return '[消息]'
}

/** 消息分类结果 */
export interface MessageClassification {
  showInChat: boolean
  showInListPreview: boolean
  previewText: string
  systemType: SystemMessageType | null
  systemLabel: string
}

/** Realtime 群组通知 contentType 范围 */
const GROUP_NOTIFICATION_MIN = 1501
const GROUP_NOTIFICATION_MAX = 1599

/**
 * 统一消息分类函数
 */
export function classifyMessage(message: Message): MessageClassification {
  const ct = Number(message.contentType)

  if (ct >= GROUP_NOTIFICATION_MIN && ct <= GROUP_NOTIFICATION_MAX) {
    return { showInChat: false, showInListPreview: false, previewText: '', systemType: null, systemLabel: '' }
  }

  const sysType = getSystemMessageType(message)
  if (sysType !== null) {
    const label = SYSTEM_MSG_LABELS[sysType] || ''

    if (sysType === SystemMsg.SessionInit || sysType === SystemMsg.MessageRead) {
      return { showInChat: false, showInListPreview: false, previewText: '', systemType: sysType, systemLabel: label }
    }

    if (sysType === SystemMsg.UserInfoUpdated) {
      return { showInChat: true, showInListPreview: false, previewText: '', systemType: sysType, systemLabel: label }
    }

    return {
      showInChat: true,
      showInListPreview: true,
      previewText: label ? `[${label}]` : '',
      systemType: sysType,
      systemLabel: label,
    }
  }

  const previewText = getContentPreview(message, ct)
  return {
    showInChat: true,
    showInListPreview: true,
    previewText,
    systemType: null,
    systemLabel: '',
  }
}

function getContentPreview(message: Message, ct: number): string {
  if (ct === MessageType.TextMessage) {
    if (message.textElem?.content) return message.textElem.content
    try {
      const parsed = JSON.parse(message.content)
      return parsed.content || message.content
    } catch {
      return message.content || ''
    }
  }
  if (ct === MessageType.PictureMessage) return '[图片]'
  if (ct === MessageType.VoiceMessage) return '[语音]'
  if (ct === MessageType.VideoMessage) return '[视频]'
  if (ct === MessageType.FileMessage) return '[文件]'
  if (ct === MessageType.CustomMessage) return '[消息]'
  return '[消息]'
}
