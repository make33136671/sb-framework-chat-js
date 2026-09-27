import type { ChatUIPlugin, PluginContext } from '../../types/index'
import { EmojiPicker } from './EmojiPicker'

/** 表情插件 */
export class EmojiPlugin implements ChatUIPlugin {
  name = 'emoji'
  version = '0.1.0'
  private picker: EmojiPicker | null = null

  install(context: PluginContext): void {
    context.registerInputTool({
      name: 'emoji',
      icon: '\u{1F600}',
      tooltip: context.i18n.t('emoji.title'),
      order: 0,
      onActivate: (ctx) => {
        if (!this.picker) {
          // 在 input wrapper 中创建 picker
          const inputWrapper = ctx.inputElement.closest('.chat-ui-input-wrapper')
          if (!inputWrapper) return

          this.picker = new EmojiPicker(
            inputWrapper as HTMLElement,
            ctx.i18n,
            (emoji: string) => {
              ctx.insertText(emoji)
            },
            () => {
              // close callback
            }
          )
        }
        this.picker.toggle()
      },
    })
  }

  uninstall(): void {
    this.picker?.destroy()
    this.picker = null
  }
}
