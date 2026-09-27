import { MessageType, type Message, type TextElement, type CustomElem, type PictureElem, type Picture } from '../types/message'
import type { Conversation } from '../types/conversation'
import type { UserInfo } from '../types/conversation'
import logger from '../utils/logger'

/**
 * C# RealtimeMessage 字段（SignalR JSON 序列化，camelCase）：
 * { id, conversationId, senderId, contentType, content, mediaIds, seq, timestamp,
 *   status, deliveredAt, readAt, editedAt, previousContent, isWithdrawn }
 *
 * JS Message 字段：
 * { clientMsgID, serverMsgID, createTime, sendTime, sendID, recvID, msgFrom,
 *   contentType, senderNickname, senderFaceUrl, content, textElem, conversationID,
 *   isRead, status, deliveredAt, readAt, editedAt, previousContent, isWithdrawn }
 */

/** C# contentType 字符串 → JS MessageType 数字 / 字符串 */
function mapContentType(ct: string | number): number | string {
  if (typeof ct === 'number') return ct
  switch (ct) {
    case 'text': return MessageType.TextMessage
    case 'image': return MessageType.PictureMessage
    case 'voice': return MessageType.VoiceMessage
    case 'video': return MessageType.VideoMessage
    case 'file': return MessageType.FileMessage
    case 'custom': return MessageType.CustomMessage
    case 'face': return MessageType.FaceMessage
    case 'quote': return MessageType.QuoteMessage
    default:
      if (ct.startsWith('sys.')) return 900
      // 命名空间类型（如 system.notice, call.voice 等）直接透传
      if (ct.includes('.')) return ct
      return MessageType.TextMessage
  }
}

/** 从 content JSON 中提取纯文本 */
function extractText(content: string | null | undefined): string {
  if (!content) return ''
  try {
    const parsed = JSON.parse(content)
    if (typeof parsed === 'string') return parsed
    if (parsed.content) return parsed.content
    return content
  } catch {
    return content
  }
}

/** 从 content JSON 中解析图片信息，构建 pictureElem */
function parsePictureElem(content: string | null | undefined): PictureElem | undefined {
  if (!content) return undefined
  try {
    const parsed = JSON.parse(content)
    const url = parsed.url || ''
    const width = parsed.width || 0
    const height = parsed.height || 0
    const size = parsed.size || 0
    const type = parsed.type || 'image/jpeg'

    if (!url) return undefined

    const pic: Picture = {
      uuid: '',
      type,
      size,
      width,
      height,
      url,
    }

    return {
      sourcePath: url,
      sourcePicture: { ...pic },
      bigPicture: { ...pic },
      snapshotPicture: { ...pic },
    }
  } catch {
    return undefined
  }
}

/** 读取可能为 PascalCase 或 camelCase 的字段 */
function pickField(raw: any, camel: string, pascal: string): any {
  if (raw[camel] !== undefined) return raw[camel]
  if (raw[pascal] !== undefined) return raw[pascal]
  return undefined
}

/** 将 C# RealtimeMessage 映射为 JS Message */
export function mapToMessage(raw: any): Message | null {
  if (!raw) return null

  // 如果已经是 JS Message 格式（有 sendID 字段），直接返回
  if (raw.sendID !== undefined) return raw as Message

  const contentType = mapContentType(raw.contentType || raw.ContentType || 'text')
  const content = raw.content ?? raw.Content ?? ''
  const textContent = extractText(content)

  const timestamp = raw.timestamp || raw.Timestamp
  const sendTime = timestamp
    ? new Date(typeof timestamp === 'string' ? timestamp : timestamp).getTime()
    : Date.now()

  const seq = raw.seq ?? raw.Seq ?? 0
  const id = raw.id ?? raw.Id ?? ''
  const senderId = raw.senderId ?? raw.SenderId ?? ''
  const conversationId = String(raw.conversationId ?? raw.ConversationId ?? '')

  // 新字段：status / 时间戳 / previousContent / isWithdrawn
  const status = pickField(raw, 'status', 'Status') ?? 2
  const deliveredAt = pickField(raw, 'deliveredAt', 'DeliveredAt')
  const readAt = pickField(raw, 'readAt', 'ReadAt')
  const editedAt = pickField(raw, 'editedAt', 'EditedAt')
  const previousContent = pickField(raw, 'previousContent', 'PreviousContent')
  const isWithdrawn = pickField(raw, 'isWithdrawn', 'IsWithdrawn')

  const textElem: TextElement | undefined = typeof contentType === 'number' && contentType === MessageType.TextMessage
    ? { content: textContent }
    : undefined

  // 图片消息：解析 content JSON 构建 pictureElem
  const pictureElem: PictureElem | undefined = typeof contentType === 'number' && contentType === MessageType.PictureMessage
    ? parsePictureElem(content)
    : undefined

  // custom 消息（含系统消息）：填充 customElem 供 isSystemMessage 检测
  const customElem: CustomElem | undefined = typeof contentType === 'number' && contentType === MessageType.CustomMessage
    ? { data: content, extension: '', description: '' }
    : undefined

  return {
    clientMsgID: id || `seq_${seq}`,
    serverMsgID: String(seq),
    createTime: sendTime,
    sendTime,
    sendID: senderId,
    recvID: '',
    msgFrom: 1,
    contentType,
    senderNickname: '',
    senderFaceUrl: '',
    content: textContent,
    textElem,
    pictureElem,
    customElem,
    conversationID: conversationId,
    isRead: false,
    status,
    deliveredAt,
    readAt,
    editedAt,
    previousContent,
    isWithdrawn,
  }
}

/** 将 C# RealtimeConversation 映射为 JS Conversation */
export function mapToConversation(raw: any): Conversation | null {
  if (!raw) return null

  // 如果已经是 JS Conversation 格式，直接返回
  if (raw.conversationID !== undefined) return raw as Conversation

  const id = String(raw.id ?? raw.Id ?? '')
  if (!id) return null

  return {
    conversationID: id,
    conversationType: (raw.type ?? raw.Type ?? 'direct') === 'group' ? 3 : 1,
    userID: '',
    groupID: (raw.type ?? raw.Type) === 'group' ? id : '',
    showName: raw.title ?? raw.Title ?? '',
    faceURL: '',
    recvMsgOpt: 0,
    unreadCount: raw.unreadCount ?? raw.UnreadCount ?? 0,
    latestMsg: raw.lastMsgPreview ?? raw.LastMsgPreview ?? '',
    latestMsgSendTime: 0,
    draftText: '',
    draftTextTime: 0,
    isPinned: false,
    isPrivateChat: false,
  }
}

/** 将 C# RealtimeConversation 数组映射为 JS Conversation 数组 */
export function mapToConversationList(raw: any): Conversation[] {
  if (!raw) return []
  const arr = Array.isArray(raw) ? raw : [raw]
  return arr.map(mapToConversation).filter((c): c is Conversation => c !== null)
}

/** 将 C# RealtimeUserInfo 映射为 JS UserInfo */
export function mapToUserInfo(raw: any): UserInfo | null {
  if (!raw) return null

  // 如果已经是 JS UserInfo 格式，直接返回
  if (raw.userID !== undefined) return raw as UserInfo

  const userId = raw.userId ?? raw.UserId ?? ''
  if (!userId) return null

  return {
    userID: userId,
    nickname: raw.nickname ?? raw.Nickname ?? '',
    faceURL: raw.avatar ?? raw.Avatar ?? '',
    createTime: 0,
    ex: '',
  }
}

/** 通用映射入口：根据数据结构自动选择映射方式 */
export function mapRealtimeData<T>(data: unknown, fallback: T): T {
  if (!data) return fallback
  try {
    if (typeof data === 'string') {
      try { data = JSON.parse(data) } catch { return data as T }
    }
    // 检测是否是 C# RealtimeMessage 格式
    const obj = data as any
    if (obj.senderId !== undefined || obj.SenderId !== undefined) {
      return mapToMessage(obj) as unknown as T
    }
    if (obj.conversationId !== undefined || obj.ConversationId !== undefined) {
      // 可能是 Conversation 或 Message
      if (obj.senderId !== undefined || obj.SenderId !== undefined) {
        return mapToMessage(obj) as unknown as T
      }
      return mapToConversation(obj) as unknown as T
    }
    return data as T
  } catch (err) {
    logger.warn('Mapper', '映射失败:', err)
    return fallback
  }
}
