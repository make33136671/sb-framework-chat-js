import type { RealtimeClient, Message } from '@sb/realtime-core'
import type { PluginManager } from './PluginManager'
import type { InputToolContext } from '../types/index'
import type { I18n } from '../i18n/I18n'
import { createElement } from '../utils/dom'

/** 发送回调 */
export type OnSendFn = (text: string) => Promise<void>

/** 输入区域 */
export class InputArea {
  private wrapper: HTMLElement
  private inputArea!: HTMLElement
  private inputElement!: HTMLInputElement
  private sendButton!: HTMLButtonElement
  private toolbarContainer!: HTMLElement
  private pluginManager: PluginManager
  private i18n: I18n
  private shadowRoot: ShadowRoot
  private core: RealtimeClient | null = null
  private onSend: OnSendFn
  private isSending = false
  private isDisabled = false
  private recvID: string = ''
  private groupId: string = ''
  private onAppendMessage: ((message: Message) => void) | null = null

  constructor(
    container: HTMLElement,
    pluginManager: PluginManager,
    i18n: I18n,
    shadowRoot: ShadowRoot,
    onSend: OnSendFn
  ) {
    this.wrapper = container
    this.pluginManager = pluginManager
    this.i18n = i18n
    this.shadowRoot = shadowRoot
    this.onSend = onSend
    this.build()
  }

  /** 设置追加消息回调 */
  setOnAppendMessage(fn: (message: Message) => void): void {
    this.onAppendMessage = fn
  }

  /** 绑定 core 实例 */
  bindCore(core: RealtimeClient): void {
    this.core = core
  }

  /** 设置接收者 ID */
  setRecvID(recvID: string): void {
    this.recvID = recvID
  }

  /** 设置群组 ID（广播模式） */
  setGroupId(groupId: string): void {
    this.groupId = groupId
  }

  /** 设置启用/禁用状态 */
  setDisabled(disabled: boolean): void {
    this.isDisabled = disabled
    this.inputElement.disabled = disabled
    this.updateSendButton()
    this.updateToolbarButtons()
  }

  /** 获取输入框元素 */
  getInputElement(): HTMLInputElement {
    return this.inputElement
  }

  /** 刷新工具栏 */
  refreshToolbar(): void {
    this.buildToolbar()
  }

  /** 刷新 UI 文本 */
  refreshTexts(): void {
    this.inputElement.placeholder = this.i18n.t('input.placeholder')
    this.updateSendButton()
    this.buildToolbar()
  }

  /** 构建输入区域 DOM */
  private build(): void {
    this.wrapper.className = 'chat-ui-input-wrapper'

    // 工具栏行（表情、图片等按钮）
    this.toolbarContainer = createElement('div', 'chat-ui-toolbar')
    this.wrapper.appendChild(this.toolbarContainer)

    // 输入行（输入框 + 发送按钮）
    this.inputArea = createElement('div', 'chat-ui-input-area')

    // 输入框
    this.inputElement = createElement('input', 'chat-ui-message-input')
    this.inputElement.type = 'text'
    this.inputElement.placeholder = this.i18n.t('input.placeholder')
    this.inputElement.addEventListener('keydown', this.handleKeydown.bind(this))
    this.inputElement.addEventListener('input', () => this.updateSendButton())
    this.inputArea.appendChild(this.inputElement)

    // 发送按钮
    this.sendButton = createElement('button', 'chat-ui-send-btn') as HTMLButtonElement
    this.sendButton.textContent = this.i18n.t('input.send')
    this.sendButton.addEventListener('click', this.handleSend.bind(this))
    this.inputArea.appendChild(this.sendButton)

    this.wrapper.appendChild(this.inputArea)

    this.buildToolbar()
    this.updateSendButton()
  }

  /** 构建工具栏按钮 */
  private buildToolbar(): void {
    while (this.toolbarContainer.firstChild) {
      this.toolbarContainer.removeChild(this.toolbarContainer.firstChild)
    }

    const tools = this.pluginManager.getInputTools()
    for (const tool of tools) {
      const btn = createElement('button', 'chat-ui-tool-btn')
      btn.innerHTML = tool.icon
      btn.title = tool.tooltip
      btn.disabled = this.isDisabled
      btn.addEventListener('click', () => {
        const context: InputToolContext = {
          inputElement: this.inputElement,
          insertText: (text: string) => {
            this.inputElement.value += text
            this.inputElement.focus()
            this.updateSendButton()
          },
          getInputText: () => this.inputElement.value,
          setInputText: (text: string) => {
            this.inputElement.value = text
            this.updateSendButton()
          },
          getRecvID: () => this.groupId || this.recvID,
          isGroup: () => !!this.groupId,
          core: this.core,
          appendMessage: (msg: Message) => {
            if (this.onAppendMessage) this.onAppendMessage(msg)
          },
          shadowRoot: this.shadowRoot,
          i18n: this.i18n,
        }
        tool.onActivate(context)
      })
      this.toolbarContainer.appendChild(btn)
    }
  }

  /** 键盘事件处理 */
  private handleKeydown(e: KeyboardEvent): void {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      this.handleSend()
    }
  }

  /** 发送消息 */
  private async handleSend(): Promise<void> {
    const text = this.inputElement.value.trim()
    if (!text || this.isSending || this.isDisabled) return

    this.isSending = true
    this.updateSendButton()

    try {
      await this.onSend(text)
      this.inputElement.value = ''
    } finally {
      this.isSending = false
      this.updateSendButton()
    }
  }

  /** 更新工具栏按钮禁用状态 */
  private updateToolbarButtons(): void {
    const buttons = this.toolbarContainer.querySelectorAll('button')
    buttons.forEach((btn) => {
      btn.disabled = this.isDisabled
    })
  }

  /** 更新发送按钮状态 */
  private updateSendButton(): void {
    const hasText = this.inputElement.value.trim().length > 0
    this.sendButton.disabled = !hasText || this.isDisabled || this.isSending
    this.sendButton.textContent = this.isSending
      ? this.i18n.t('input.sending')
      : this.i18n.t('input.send')
  }
}
