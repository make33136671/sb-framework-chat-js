/** 将容器滚动到底部 */
export function scrollToBottom(container: HTMLElement): void {
  requestAnimationFrame(() => {
    container.scrollTop = container.scrollHeight
  })
}

/** 检查容器是否接近底部（用于判断是否自动滚动） */
export function isNearBottom(container: HTMLElement, threshold: number = 100): boolean {
  const { scrollTop, scrollHeight, clientHeight } = container
  return scrollHeight - scrollTop - clientHeight < threshold
}
