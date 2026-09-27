// --- 核心 ---
export { ChatUI } from './core/ChatUI'
export { PluginManager } from './core/PluginManager'
export { ThemeManager } from './core/ThemeManager'
export { MessageListRenderer } from './core/MessageListRenderer'
export { InputArea } from './core/InputArea'

// --- 内置插件 ---
export { TextPlugin } from './plugins/text/TextPlugin'
export { ImagePlugin } from './plugins/image/ImagePlugin'
export { EmojiPlugin } from './plugins/emoji/EmojiPlugin'

// --- 插件子模块 ---
export { TextRenderer } from './plugins/text/TextRenderer'
export { ImageRenderer } from './plugins/image/ImageRenderer'
export { ImagePreview } from './plugins/image/ImagePreview'
export { EmojiPicker } from './plugins/emoji/EmojiPicker'
export { emojiList, emojiCategories } from './plugins/emoji/EmojiData'

// --- i18n ---
export { I18n, type Locale } from './i18n/I18n'
export { zhCN } from './i18n/zh-CN'
export { enUS } from './i18n/en-US'

// --- 工具 ---
export { createElement, clearChildren, setTextContent, toggleClass } from './utils/dom'
export { scrollToBottom, isNearBottom } from './utils/scroll'
export { formatMessageTime } from './utils/time'
export { createAvatarElement, getAvatarText } from './utils/avatar'

// --- 类型 ---
export type {
  ChatUIOptions,
  ChatUIPlugin,
  PluginContext,
  MessageRenderer,
  RenderContext,
  InputTool,
  InputToolContext,
  SenderInfo,
} from './types/index'
