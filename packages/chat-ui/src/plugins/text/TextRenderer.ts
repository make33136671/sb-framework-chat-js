import type { Message } from '@sb/realtime-core'
import type { MessageRenderer, RenderContext } from '../../types/index'
import { MessageType } from '@sb/realtime-core'
import { createElement } from '../../utils/dom'

/** 文本消息渲染器 */
export class TextRenderer implements MessageRenderer {
  contentTypes = [MessageType.TextMessage]

  render(message: Message, context: RenderContext): HTMLElement {
    const bubble = createElement('div', 'chat-ui-bubble')
    bubble.textContent = message.textElem?.content
      || message.content
      || context.i18n.t('message.unknownType')
    return bubble
  }
}
