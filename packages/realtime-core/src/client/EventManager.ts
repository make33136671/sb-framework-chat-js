import type { RealtimeEventType, RealtimeEventMap, EventCallback } from '../types/events'

/** 类型安全的事件管理器 */
export class EventManager {
  private listeners: Map<RealtimeEventType, Set<EventCallback<any>>> = new Map()

  /** 注册事件监听 */
  on<E extends RealtimeEventType>(event: E, callback: EventCallback<RealtimeEventMap[E]>): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(callback)
  }

  /** 移除事件监听 */
  off<E extends RealtimeEventType>(event: E, callback: EventCallback<RealtimeEventMap[E]>): void {
    const set = this.listeners.get(event)
    if (set) {
      set.delete(callback)
    }
  }

  /** 触发事件 */
  emit<E extends RealtimeEventType>(event: E, data: RealtimeEventMap[E]): void {
    const set = this.listeners.get(event)
    const count = set ? set.size : 0
    if (event === 'message:received') {
      console.log('[EventManager] emit message:received, 监听器数量:', count)
    }
    if (set) {
      set.forEach((cb) => cb(data))
    }
  }

  /** 清除所有事件监听 */
  clear(): void {
    this.listeners.clear()
  }

  /** 清除指定事件的所有监听 */
  clearEvent(event: RealtimeEventType): void {
    this.listeners.delete(event)
  }
}
