import type { I18n } from '../i18n/I18n'

/** 格式化消息时间 */
export function formatMessageTime(timestamp: number, i18n?: I18n): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMinutes = Math.floor(diffMs / 60000)

  if (diffMinutes < 1) {
    return i18n?.t('time.just_now') ?? '刚刚'
  }

  if (diffMinutes < 60) {
    return i18n?.t('time.minutes_ago', { n: diffMinutes }) ?? `${diffMinutes}分钟前`
  }

  // 今天：显示时:分
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  }

  // 昨天
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (date.toDateString() === yesterday.toDateString()) {
    const prefix = i18n?.t('time.yesterday') ?? '昨天'
    return `${prefix} ${date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`
  }

  // 更早：月-日 时:分
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}
