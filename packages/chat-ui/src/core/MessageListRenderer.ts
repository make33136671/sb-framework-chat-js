import type { Message } from '@saiboniuma/realtime-core'
import { isSystemMessage } from '@saiboniuma/realtime-core'
import type { PluginManager } from './PluginManager'
import type { RenderContext, SenderInfo } from '../types/index'
import type { I18n } from '../i18n/I18n'
import { createElement, clearChildren } from '../utils/dom'
import { createAvatarElement } from '../utils/avatar'
import { formatMessageTime } from '../utils/time'
import { scrollToBottom, isNearBottom } from '../utils/scroll'

/** 获取发送者信息的回调 */
export type GetSenderInfoFn = (message: Message) => SenderInfo

/** 消息列表渲染器 */
export class MessageListRenderer {
  private container: HTMLElement
  private pluginManager: PluginManager
  private i18n: I18n
  private shadowRoot: ShadowRoot
  private currentUserID: string = ''
  private getSenderInfo: GetSenderInfoFn
  private messages: Message[] = []
  private renderedMsgIds: Set<string> = new Set()

  constructor(
    container: HTMLElement,
    pluginManager: PluginManager,
    i18n: I18n,
    shadowRoot: ShadowRoot,
    getSenderInfo: GetSenderInfoFn
  ) {
    this.container = container
    this.pluginManager = pluginManager
    this.i18n = i18n
    this.shadowRoot = shadowRoot
    this.getSenderInfo = getSenderInfo
  }

  /** 设置当前用户 ID */
  setCurrentUserID(userID: string): void {
    this.currentUserID = userID
  }

  /** 更新消息列表 */
  updateMessages(messages: Message[]): void {
    // 过滤系统消息 + 去重
    const filtered = messages.filter((msg) => !isSystemMessage(msg))
    const deduped: Message[] = []
    const seen = new Set<string>()
    for (const msg of filtered) {
      if (!seen.has(msg.clientMsgID)) {
        seen.add(msg.clientMsgID)
        deduped.push(msg)
      }
    }

    this.messages = deduped
    this.render()
  }

  /** 追加单条新消息 */
  appendMessage(message: Message): void {
    if (isSystemMessage(message)) {
      console.log('[MessageListRenderer] appendMessage 跳过: 系统消息, clientMsgID:', message.clientMsgID)
      return
    }
    if (this.renderedMsgIds.has(message.clientMsgID)) {
      console.log('[MessageListRenderer] appendMessage 跳过: 重复消息, clientMsgID:', message.clientMsgID)
      return
    }
    console.log('[MessageListRenderer] appendMessage 渲染消息, clientMsgID:', message.clientMsgID, 'sendID:', message.sendID)

    // 首条消息：移除空状态提示
    if (this.messages.length === 0) {
      clearChildren(this.container)
    }

    this.messages.push(message)
    const wasNearBottom = isNearBottom(this.container)
    this.renderMessageItem(message)

    if (wasNearBottom) {
      scrollToBottom(this.container)
    }
  }

  /** 滚动到底部 */
  scrollToBottom(): void {
    scrollToBottom(this.container)
  }

  /** 完整渲染消息列表 */
  private render(): void {
    clearChildren(this.container)
    this.renderedMsgIds.clear()

    if (this.messages.length === 0) {
      this.renderEmptyState()
      return
    }

    for (const msg of this.messages) {
      this.renderMessageItem(msg)
    }

    scrollToBottom(this.container)
  }

  /** 渲染空状态 */
  private renderEmptyState(): void {
    const empty = createElement('div', 'chat-ui-empty')
    const p1 = createElement('p')
    p1.textContent = this.i18n.t('message.empty')
    const p2 = createElement('p', 'chat-ui-empty-hint')
    p2.textContent = this.i18n.t('message.emptyHint')
    empty.appendChild(p1)
    empty.appendChild(p2)
    this.container.appendChild(empty)
  }

  /** 渲染单条消息 */
  private renderMessageItem(message: Message): void {
    this.renderedMsgIds.add(message.clientMsgID)

    const isSelf = message.sendID === this.currentUserID
    const senderInfo = this.getSenderInfo(message)

    const item = createElement('div', `chat-ui-message-item${isSelf ? ' is-self' : ''}`)

    // 头部：头像 + 昵称
    const header = createElement('div', 'chat-ui-message-header')
    const avatar = createAvatarElement(
      senderInfo.avatar,
      senderInfo.nickname,
      `chat-ui-avatar${isSelf ? ' avatar-self' : ''}`
    )
    const nickname = createElement('div', 'chat-ui-message-nickname')
    nickname.textContent = senderInfo.nickname
    header.appendChild(avatar)
    header.appendChild(nickname)
    item.appendChild(header)

    // 气泡行
    const bubbleRow = createElement('div', 'chat-ui-bubble-row')
    const renderContext: RenderContext = {
      isSelf,
      currentUserID: this.currentUserID,
      i18n: this.i18n,
      shadowRoot: this.shadowRoot,
    }

    const renderer = this.pluginManager.getRenderer(message)
    if (renderer) {
      const content = renderer.render(message, renderContext)
      bubbleRow.appendChild(content)
    } else {
      // 无渲染器，显示默认气泡
      const bubble = createElement('div', 'chat-ui-bubble')
      bubble.textContent = this.i18n.t('message.unknownType')
      bubbleRow.appendChild(bubble)
    }
    item.appendChild(bubbleRow)

    // 时间
    const time = createElement('div', 'chat-ui-message-time')
    time.textContent = formatMessageTime(message.sendTime, this.i18n)
    item.appendChild(time)

    this.container.appendChild(item)
  }

  /** 刷新所有消息的 UI 文本（语言切换时调用） */
  refreshTexts(): void {
    this.render()
  }

  /** 清空 */
  clear(): void {
    this.messages = []
    this.renderedMsgIds.clear()
    clearChildren(this.container)
  }
}
