import { zhCN } from './zh-CN'
import { enUS } from './en-US'

export type Locale = 'zh-CN' | 'en-US' | string

/** 多语言管理器 */
export class I18n {
  private currentLocale: Locale = 'zh-CN'
  private messages: Map<string, Record<string, string>> = new Map()
  private changeListeners: Set<() => void> = new Set()

  constructor(locale?: Locale) {
    this.messages.set('zh-CN', { ...zhCN })
    this.messages.set('en-US', { ...enUS })
    if (locale) {
      this.currentLocale = locale
    }
  }

  /** 翻译文本 */
  t(key: string, params?: Record<string, string | number>): string {
    const localeMessages = this.messages.get(this.currentLocale)
    let text = localeMessages?.[key]
      ?? this.messages.get('zh-CN')?.[key]
      ?? key

    if (params) {
      for (const [k, v] of Object.entries(params)) {
        text = text.replace(`{${k}}`, String(v))
      }
    }
    return text
  }

  /** 获取当前语言 */
  getLocale(): Locale {
    return this.currentLocale
  }

  /** 切换语言（触发所有监听器刷新 UI） */
  setLocale(locale: Locale): void {
    if (this.currentLocale === locale) return
    this.currentLocale = locale
    this.changeListeners.forEach((cb) => cb())
  }

  /** 注册语言包（可用于插件扩展） */
  registerLocale(locale: string, messages: Record<string, string>): void {
    const existing = this.messages.get(locale) || {}
    this.messages.set(locale, { ...existing, ...messages })
  }

  /** 监听语言切换 */
  onChange(callback: () => void): void {
    this.changeListeners.add(callback)
  }

  /** 移除语言切换监听 */
  offChange(callback: () => void): void {
    this.changeListeners.delete(callback)
  }

  /** 销毁 */
  destroy(): void {
    this.changeListeners.clear()
  }
}
