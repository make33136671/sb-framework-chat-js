import type { Message } from '@saiboniuma/realtime-core'
import type {
  ChatUIPlugin,
  PluginContext,
  MessageRenderer,
  InputTool,
} from '../types/index'
import type { I18n } from '../i18n/I18n'

/** 插件管理器 */
export class PluginManager {
  private renderers: MessageRenderer[] = []
  private inputTools: InputTool[] = []
  private plugins: Map<string, ChatUIPlugin> = new Map()
  private i18n: I18n

  constructor(i18n: I18n) {
    this.i18n = i18n
  }

  /** 注册插件 */
  register(plugin: ChatUIPlugin): void {
    if (this.plugins.has(plugin.name)) return

    const context: PluginContext = {
      registerRenderer: (renderer: MessageRenderer) => {
        this.renderers.push(renderer)
      },
      registerInputTool: (tool: InputTool) => {
        this.inputTools.push(tool)
        this.inputTools.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      },
      i18n: this.i18n,
      registerLocale: (locale: string, messages: Record<string, string>) => {
        this.i18n.registerLocale(locale, messages)
      },
    }

    plugin.install(context)
    this.plugins.set(plugin.name, plugin)
  }

  /** 注销插件 */
  unregister(pluginName: string): void {
    const plugin = this.plugins.get(pluginName)
    if (!plugin) return

    plugin.uninstall?.()
    this.plugins.delete(pluginName)

    // 重新收集存活插件的渲染器和工具
    this.renderers = []
    this.inputTools = []
    for (const p of this.plugins.values()) {
      const context: PluginContext = {
        registerRenderer: (renderer: MessageRenderer) => {
          this.renderers.push(renderer)
        },
        registerInputTool: (tool: InputTool) => {
          this.inputTools.push(tool)
        },
        i18n: this.i18n,
        registerLocale: (locale: string, messages: Record<string, string>) => {
          this.i18n.registerLocale(locale, messages)
        },
      }
      p.install(context)
    }
    this.inputTools.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  }

  /** 根据消息查找合适的渲染器 */
  getRenderer(message: Message): MessageRenderer | null {
    // 优先匹配 canRender（用于 CustomMessage 子类型）
    for (const renderer of this.renderers) {
      if (renderer.canRender?.(message)) return renderer
    }
    // 回退到 contentType 匹配
    for (const renderer of this.renderers) {
      if (renderer.contentTypes.includes(Number(message.contentType))) return renderer
    }
    return null
  }

  /** 获取所有输入工具按钮 */
  getInputTools(): InputTool[] {
    return this.inputTools
  }

  /** 销毁所有插件 */
  destroy(): void {
    for (const plugin of this.plugins.values()) {
      plugin.uninstall?.()
    }
    this.plugins.clear()
    this.renderers = []
    this.inputTools = []
  }
}
