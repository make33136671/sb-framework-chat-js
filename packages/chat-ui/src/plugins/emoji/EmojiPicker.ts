import type { I18n } from '../../i18n/I18n'
import { createElement, clearChildren } from '../../utils/dom'
import { emojiList, emojiCategories } from './EmojiData'

/** 表情选择器 UI */
export class EmojiPicker {
  private container: HTMLElement
  private i18n: I18n
  private activeCategory = 0
  private onSelect: (emoji: string) => void
  private onClose: () => void
  private visible = false
  private pickerEl: HTMLElement | null = null
  private gridEl: HTMLElement | null = null
  private categoryBtns: HTMLElement[] = []

  constructor(
    container: HTMLElement,
    i18n: I18n,
    onSelect: (emoji: string) => void,
    onClose: () => void
  ) {
    this.container = container
    this.i18n = i18n
    this.onSelect = onSelect
    this.onClose = onClose
  }

  /** 显示/隐藏表情面板 */
  toggle(): void {
    if (this.visible) {
      this.hide()
    } else {
      this.show()
    }
  }

  /** 显示面板 */
  show(): void {
    if (this.visible) return
    this.visible = true
    this.build()
  }

  /** 隐藏面板 */
  hide(): void {
    if (!this.visible) return
    this.visible = false
    if (this.pickerEl) {
      this.pickerEl.remove()
      this.pickerEl = null
    }
    this.onClose()
  }

  /** 是否可见 */
  isVisible(): boolean {
    return this.visible
  }

  /** 刷新文本（语言切换时） */
  refreshTexts(): void {
    if (this.visible) {
      this.hide()
    }
  }

  /** 构建面板 DOM */
  private build(): void {
    this.pickerEl = createElement('div', 'chat-ui-emoji-picker')

    // 分类标签栏
    const categoriesBar = createElement('div', 'chat-ui-emoji-categories')
    this.categoryBtns = []
    emojiCategories.forEach((cat, index) => {
      const btn = createElement('button', `chat-ui-category-btn${index === this.activeCategory ? ' active' : ''}`)
      btn.textContent = this.i18n.t(cat.nameKey)
      btn.addEventListener('click', () => {
        this.activeCategory = index
        this.updateCategoryButtons()
        this.renderGrid()
      })
      this.categoryBtns.push(btn)
      categoriesBar.appendChild(btn)
    })
    this.pickerEl.appendChild(categoriesBar)

    // Emoji 网格
    this.gridEl = createElement('div', 'chat-ui-emoji-grid')
    this.renderGrid()
    this.pickerEl.appendChild(this.gridEl)

    this.container.insertBefore(this.pickerEl, this.container.firstChild)
  }

  /** 渲染当前分类的 Emoji 网格 */
  private renderGrid(): void {
    if (!this.gridEl) return
    clearChildren(this.gridEl)

    const cat = emojiCategories[this.activeCategory]!
    const emojis = emojiList.slice(cat.start, cat.end)

    for (const emoji of emojis) {
      const btn = createElement('button', 'chat-ui-emoji-btn')
      btn.textContent = emoji
      btn.addEventListener('click', () => {
        this.onSelect(emoji)
        this.hide()
      })
      this.gridEl.appendChild(btn)
    }
  }

  /** 更新分类按钮高亮 */
  private updateCategoryButtons(): void {
    this.categoryBtns.forEach((btn, index) => {
      btn.className = `chat-ui-category-btn${index === this.activeCategory ? ' active' : ''}`
    })
  }

  /** 销毁 */
  destroy(): void {
    this.hide()
  }
}
