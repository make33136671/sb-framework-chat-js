import type { RealtimeClient, Message } from '@sb/realtime-core'
import type { ChatUIOptions, ChatUIPlugin, SenderInfo } from '../types/index'
import { PluginManager } from './PluginManager'
import { ThemeManager } from './ThemeManager'
import { MessageListRenderer } from './MessageListRenderer'
import { InputArea } from './InputArea'
import { I18n, type Locale } from '../i18n/I18n'
import { createElement } from '../utils/dom'

import baseCSS from '../styles/base.css?inline'
import messageListCSS from '../styles/message-list.css?inline'
import inputAreaCSS from '../styles/input-area.css?inline'
import imageCSSFile from '../styles/plugins/image.css?inline'
import emojiCSSFile from '../styles/plugins/emoji.css?inline'

/** 聊天 UI 容器主类 */
export class ChatUI {
  private host: HTMLElement
  private shadowRoot: ShadowRoot
  private root: HTMLElement
  private messageListEl: HTMLElement
  private inputWrapperEl: HTMLElement

  private pluginManager: PluginManager
  private themeManager: ThemeManager
  private messageListRenderer: MessageListRenderer
  private inputArea: InputArea
  private i18n: I18n
  private core: RealtimeClient | null = null

  private currentUserID: string = ''
  private userInfo: SenderInfo = { nickname: '访客', avatar: '' }
  private agentInfo: SenderInfo = { nickname: '客服', avatar: '' }
  private agentUserID: string = ''
  private groupId: string = ''

  constructor(container: HTMLElement, options: ChatUIOptions = {}) {
    // 创建 Shadow DOM
    this.host = createElement('div', 'chat-ui-host')
    this.shadowRoot = this.host.attachShadow({ mode: 'open' })
    container.appendChild(this.host)

    // 注入样式
    const style = document.createElement('style')
    style.textContent = [baseCSS, messageListCSS, inputAreaCSS, imageCSSFile, emojiCSSFile].join('\n')
    this.shadowRoot.appendChild(style)

    // 根容器
    this.root = createElement('div', `chat-ui-root${options.fullPage ? ' full-page' : ''}`)
    this.shadowRoot.appendChild(this.root)

    // i18n
    this.i18n = new I18n(options.locale)

    // 主题
    this.themeManager = new ThemeManager()
    this.themeManager.bind(this.root)
    if (options.theme) {
      this.themeManager.setTheme(options.theme)
    }

    // 插件管理器
    this.pluginManager = new PluginManager(this.i18n)

    // 消息列表
    this.messageListEl = createElement('div', 'chat-ui-message-list')
    this.root.appendChild(this.messageListEl)

    this.messageListRenderer = new MessageListRenderer(
      this.messageListEl,
      this.pluginManager,
      this.i18n,
      this.shadowRoot,
      this.getSenderInfo.bind(this)
    )

    // 输入区域
    this.inputWrapperEl = createElement('div')
    this.root.appendChild(this.inputWrapperEl)

    this.inputArea = new InputArea(
      this.inputWrapperEl,
      this.pluginManager,
      this.i18n,
      this.shadowRoot,
      this.handleSend.bind(this)
    )
    this.inputArea.setOnAppendMessage((msg) => {
      this.messageListRenderer.appendMessage(msg)
      this.messageListRenderer.scrollToBottom()
    })
    this.inputArea.setDisabled(true) // 初始禁用

    // 注册插件
    if (options.plugins) {
      for (const plugin of options.plugins) {
        this.pluginManager.register(plugin)
      }
      this.inputArea.refreshToolbar()
    }

    // 语言切换时刷新 UI
    this.i18n.onChange(() => {
      this.messageListRenderer.refreshTexts()
      this.inputArea.refreshTexts()
    })
  }

  /** 绑定 RealtimeClient 核心实例 */
  bindCore(core: RealtimeClient): void {
    this.core = core
    this.inputArea.bindCore(core)

    // 监听消息
    core.on('message:received', (msg: Message) => {
      console.log('[ChatUI] message:received 回调触发, clientMsgID:', msg.clientMsgID, 'sendID:', msg.sendID)
      this.messageListRenderer.appendMessage(msg)
    })

    // 监听连接状态
    core.on('connection:success', () => {
      this.inputArea.setDisabled(false)
      this.hideOverlay()
    })

    core.on('connection:failed', () => {
      this.inputArea.setDisabled(true)
      this.showErrorOverlay()
    })

    core.on('connection:connecting', () => {
      this.showLoadingOverlay()
    })
  }

  /** 设置当前用户信息（用于消息渲染） */
  setUserInfo(userID: string, nickname: string, avatar: string): void {
    this.currentUserID = userID
    this.userInfo = { nickname, avatar }
    this.messageListRenderer.setCurrentUserID(userID)
  }

  /** 设置客服信息（用于消息渲染） */
  setAgentInfo(agentUserID: string, nickname: string, avatar: string): void {
    this.agentUserID = agentUserID
    this.agentInfo = { nickname, avatar }
    this.inputArea.setRecvID(agentUserID)
  }

  /** 设置群组 ID（广播模式下消息发送到群组） */
  setGroupId(groupId: string): void {
    this.groupId = groupId
    this.inputArea.setGroupId(groupId)
  }

  /** 加载并渲染消息列表 */
  setMessages(messages: Message[]): void {
    this.messageListRenderer.updateMessages(messages)
  }

  /** 追加单条消息 */
  appendMessage(message: Message): void {
    this.messageListRenderer.appendMessage(message)
  }

  /** 启用/禁用输入 */
  setInputEnabled(enabled: boolean): void {
    this.inputArea.setDisabled(!enabled)
  }

  /** 滚动到底部 */
  scrollToBottom(): void {
    this.messageListRenderer.scrollToBottom()
  }

  /** 注册插件 */
  registerPlugin(plugin: ChatUIPlugin): void {
    this.pluginManager.register(plugin)
    this.inputArea.refreshToolbar()
  }

  /** 注销插件 */
  unregisterPlugin(pluginName: string): void {
    this.pluginManager.unregister(pluginName)
    this.inputArea.refreshToolbar()
  }

  /** 切换语言 */
  setLocale(locale: Locale): void {
    this.i18n.setLocale(locale)
  }

  /** 切换主题 */
  setTheme(theme: 'light' | 'dark'): void {
    this.themeManager.setTheme(theme)
  }

  /** 获取 i18n 实例（供插件使用） */
  getI18n(): I18n {
    return this.i18n
  }

  /** 获取 Shadow Root */
  getShadowRoot(): ShadowRoot {
    return this.shadowRoot
  }

  /** 销毁 */
  destroy(): void {
    this.pluginManager.destroy()
    this.i18n.destroy()
    this.messageListRenderer.clear()
    this.host.remove()
  }

  /** 获取发送者信息 */
  private getSenderInfo(message: Message): SenderInfo {
    if (message.sendID === this.currentUserID) {
      return this.userInfo
    }
    return this.agentInfo
  }

  /** 发送消息回调 */
  private async handleSend(text: string): Promise<void> {
    if (!this.core || !this.agentUserID) return

    const isGroup = !!this.groupId
    const recvID = isGroup ? this.groupId : this.agentUserID
    try {
      const message = await this.core.message.sendText(recvID, text, isGroup)
      if (message) {
        this.messageListRenderer.appendMessage(message)
        this.messageListRenderer.scrollToBottom()
      }
    } catch (err) {
      console.error('[ChatUI] 发送消息失败:', err)
      this.inputArea.setDisabled(false)
    }
  }

  /** 显示加载中覆盖层 */
  private showLoadingOverlay(): void {
    this.hideOverlay()
    const overlay = createElement('div', 'chat-ui-overlay')
    overlay.setAttribute('data-type', 'loading')
    const spinner = createElement('div', 'chat-ui-spinner')
    const text = createElement('span', 'chat-ui-overlay-text')
    text.textContent = this.i18n.t('status.connecting')
    overlay.appendChild(spinner)
    overlay.appendChild(text)
    this.root.appendChild(overlay)
  }

  /** 显示错误覆盖层 */
  private showErrorOverlay(): void {
    this.hideOverlay()
    const overlay = createElement('div', 'chat-ui-overlay')
    overlay.setAttribute('data-type', 'error')
    const icon = createElement('div', 'chat-ui-error-icon')
    icon.textContent = '!'
    const text = createElement('span', 'chat-ui-overlay-text')
    text.textContent = this.i18n.t('status.disconnected')
    const btn = createElement('button', 'chat-ui-reconnect-btn')
    btn.textContent = this.i18n.t('status.reconnect')
    btn.addEventListener('click', () => {
      // 由外部处理重连
      this.host.dispatchEvent(new CustomEvent('reconnect'))
    })
    overlay.appendChild(icon)
    overlay.appendChild(text)
    overlay.appendChild(btn)
    this.root.appendChild(overlay)
  }

  /** 隐藏覆盖层 */
  private hideOverlay(): void {
    const existing = this.root.querySelector('.chat-ui-overlay')
    if (existing) existing.remove()
  }
}
