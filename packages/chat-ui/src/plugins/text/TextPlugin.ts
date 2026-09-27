import type { ChatUIPlugin, PluginContext } from '../../types/index'
import { TextRenderer } from './TextRenderer'

/** 文本消息插件 */
export class TextPlugin implements ChatUIPlugin {
  name = 'text'
  version = '0.1.0'

  install(context: PluginContext): void {
    context.registerRenderer(new TextRenderer())
  }
}
