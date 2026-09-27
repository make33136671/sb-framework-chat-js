import { createElement } from './dom'

/** 创建头像元素（含加载失败 fallback） */
export function createAvatarElement(
  avatarUrl: string,
  nickname: string,
  className: string = 'chat-ui-avatar'
): HTMLElement {
  const wrapper = createElement('div', className)

  if (avatarUrl) {
    const img = createElement('img', 'chat-ui-avatar-img')
    img.src = avatarUrl
    img.alt = nickname
    img.onerror = () => {
      img.style.display = 'none'
      const fallback = createAvatarFallback(nickname)
      wrapper.appendChild(fallback)
    }
    wrapper.appendChild(img)
  } else {
    const fallback = createAvatarFallback(nickname)
    wrapper.appendChild(fallback)
  }

  return wrapper
}

/** 创建头像 fallback（显示首字母） */
function createAvatarFallback(nickname: string): HTMLElement {
  const fallback = createElement('div', 'chat-ui-avatar-fallback')
  fallback.textContent = getAvatarText(nickname)
  return fallback
}

/** 获取头像显示文本（首字母大写） */
export function getAvatarText(nickname: string): string {
  return nickname ? nickname.charAt(0).toUpperCase() : '?'
}
