import type { Message, CustomImageData } from '@saiboniuma/realtime-core'
import { MessageType } from '@saiboniuma/realtime-core'
import type { MessageRenderer, RenderContext } from '../../types/index'
import { createElement } from '../../utils/dom'
import { ImagePreview } from './ImagePreview'

/** 解析自定义图片消息数据 */
function parseCustomImageData(message: Message): CustomImageData | null {
  if (Number(message.contentType) !== MessageType.CustomMessage) return null
  if (!message.customElem?.data) return null
  try {
    const data = JSON.parse(message.customElem.data) as CustomImageData
    if (data.type === 'image' && data.url) return data
  } catch { /* ignore */ }
  return null
}

/** 获取图片 URL */
function getImageUrl(message: Message, useThumbnail: boolean = true): string {
  if (message.pictureElem) {
    if (useThumbnail && message.pictureElem.snapshotPicture?.url) return message.pictureElem.snapshotPicture.url
    if (message.pictureElem.bigPicture?.url) return message.pictureElem.bigPicture.url
    if (message.pictureElem.sourcePicture?.url) return message.pictureElem.sourcePicture.url
  }
  const customData = parseCustomImageData(message)
  if (customData) return customData.url
  return ''
}

/** 图片消息渲染器 */
export class ImageRenderer implements MessageRenderer {
  contentTypes = [MessageType.PictureMessage]

  /** 同时匹配自定义图片消息 */
  canRender(message: Message): boolean {
    if (Number(message.contentType) === MessageType.PictureMessage) return true
    return parseCustomImageData(message) !== null
  }

  render(message: Message, context: RenderContext): HTMLElement {
    const bubble = createElement('div', 'chat-ui-bubble chat-ui-message-image')

    const url = getImageUrl(message)
    if (url) {
      const img = createElement('img', 'chat-ui-chat-image')
      img.src = url
      img.setAttribute('referrerpolicy', 'no-referrer')
      img.addEventListener('click', () => {
        const fullUrl = getImageUrl(message, false)
        if (fullUrl) {
          ImagePreview.show(fullUrl, context.shadowRoot)
        }
      })
      img.onerror = () => {
        img.style.display = 'none'
        const errorSpan = createElement('span', 'chat-ui-image-error')
        errorSpan.textContent = context.i18n.t('message.imageError')
        bubble.appendChild(errorSpan)
      }
      bubble.appendChild(img)
    } else {
      const errorSpan = createElement('span', 'chat-ui-image-error')
      errorSpan.textContent = context.i18n.t('message.imageError')
      bubble.appendChild(errorSpan)
    }

    return bubble
  }
}
