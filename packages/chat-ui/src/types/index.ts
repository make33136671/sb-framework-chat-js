import type { Message, RealtimeClient } from '@sb/realtime-core'
import type { I18n } from '../i18n/I18n'

/** 聊天 UI 配置选项 */
export interface ChatUIOptions {
  /** 注册的插件列表 */
  plugins?: ChatUIPlugin[]
  /** 主题（light/dark） */
  theme?: 'light' | 'dark'
  /** 语言 */
  locale?: string
  /** 是否全屏模式 */
  fullPage?: boolean
}

/** 聊天 UI 插件接口 */
export interface ChatUIPlugin {
  /** 插件名称 */
  name: string
  /** 插件版本 */
  version: string
  /** 安装插件（注册渲染器和工具按钮） */
  install(context: PluginContext): void
  /** 卸载插件 */
  uninstall?(): void
}

/** 插件安装上下文 */
export interface PluginContext {
  /** 注册消息渲染器 */
  registerRenderer(renderer: MessageRenderer): void
  /** 注册输入工具按钮 */
  registerInputTool(tool: InputTool): void
  /** i18n 实例 */
  i18n: I18n
  /** 注册插件语言包 */
  registerLocale(locale: string, messages: Record<string, string>): void
}

/** 消息渲染器接口 */
export interface MessageRenderer {
  /** 支持的 contentType 列表 */
  contentTypes: number[]
  /** 渲染消息内容，返回 DOM 元素 */
  render(message: Message, context: RenderContext): HTMLElement
  /** 自定义消息匹配器（用于 CustomMessage 子类型判断） */
  canRender?(message: Message): boolean
}

/** 渲染上下文 */
export interface RenderContext {
  /** 是否是自己发的消息 */
  isSelf: boolean
  /** 当前用户 ID */
  currentUserID: string
  /** i18n 实例 */
  i18n: I18n
  /** Shadow Root（用于插入弹窗等） */
  shadowRoot: ShadowRoot
}

/** 输入区工具按钮接口 */
export interface InputTool {
  /** 工具名称 */
  name: string
  /** 图标（emoji 或 HTML） */
  icon: string
  /** 提示文字 */
  tooltip: string
  /** 排序优先级（越小越靠前） */
  order?: number
  /** 点击回调 */
  onActivate(context: InputToolContext): void
}

/** 输入工具上下文 */
export interface InputToolContext {
  /** 输入框元素 */
  inputElement: HTMLInputElement
  /** 插入文本到输入框 */
  insertText(text: string): void
  /** 获取当前输入文本 */
  getInputText(): string
  /** 设置输入文本 */
  setInputText(text: string): void
  /** 获取接收者 ID（群聊模式下返回 groupId） */
  getRecvID(): string
  /** 是否群聊模式 */
  isGroup(): boolean
  /** core 实例 */
  core: RealtimeClient | null
  /** 追加消息到聊天列表 */
  appendMessage(message: Message): void
  /** Shadow Root */
  shadowRoot: ShadowRoot
  /** i18n 实例 */
  i18n: I18n
}

/** 用户信息（用于渲染消息头像和昵称） */
export interface SenderInfo {
  nickname: string
  avatar: string
}
