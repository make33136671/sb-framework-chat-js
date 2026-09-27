import { createElement } from '../../utils/dom'

/** 图片预览（全屏遮罩层） */
export class ImagePreview {
  private static overlay: HTMLElement | null = null

  /** 显示图片预览 */
  static show(imageUrl: string, shadowRoot: ShadowRoot): void {
    ImagePreview.close(shadowRoot)

    const overlay = createElement('div', 'chat-ui-image-preview-overlay')
    overlay.addEventListener('click', () => ImagePreview.close(shadowRoot))

    const container = createElement('div', 'chat-ui-image-preview-container')
    container.addEventListener('click', (e) => e.stopPropagation())

    const img = createElement('img', 'chat-ui-preview-image')
    img.src = imageUrl

    const closeBtn = createElement('button', 'chat-ui-close-preview-btn')
    closeBtn.innerHTML = '&times;'
    closeBtn.addEventListener('click', () => ImagePreview.close(shadowRoot))

    container.appendChild(img)
    container.appendChild(closeBtn)
    overlay.appendChild(container)

    shadowRoot.appendChild(overlay)
    ImagePreview.overlay = overlay
  }

  /** 关闭图片预览 */
  static close(shadowRoot: ShadowRoot): void {
    if (ImagePreview.overlay && ImagePreview.overlay.parentNode === shadowRoot) {
      shadowRoot.removeChild(ImagePreview.overlay)
      ImagePreview.overlay = null
    }
  }
}
