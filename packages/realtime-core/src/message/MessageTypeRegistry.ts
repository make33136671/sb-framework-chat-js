/** 消息类型渲染器 */
export interface MessageTypeRenderer {
  canRender(message: any): boolean
  render(message: any, container: HTMLElement): void
}

/** 消息类型处理器 */
export interface MessageTypeHandler {
  onClick?(message: any): void
}

/**
 * 前端消息类型注册表
 *
 * 用于注册自定义消息类型的渲染器和处理器，
 * 支持业务层动态扩展消息类型的展示与交互逻辑。
 */
export class MessageTypeRegistry {
  private types = new Map<string, { renderer: MessageTypeRenderer; handler: MessageTypeHandler }>()

  /**
   * 注册一种消息类型
   * @param typeName 消息类型名称（如 'custom.card'）
   * @param renderer 渲染器
   * @param handler 处理器（可选）
   */
  register(typeName: string, renderer: MessageTypeRenderer, handler: MessageTypeHandler = {}): void {
    this.types.set(typeName, { renderer, handler })
  }

  /**
   * 尝试解析已注册的消息类型
   * @param typeName 消息类型名称
   * @returns 渲染器与处理器，或 null（未注册）
   */
  tryResolve(typeName: string): { renderer: MessageTypeRenderer; handler: MessageTypeHandler } | null {
    const entry = this.types.get(typeName)
    return entry ? { ...entry } : null
  }

  /**
   * 判断某类型是否已注册
   * @param typeName 消息类型名称
   */
  isRegistered(typeName: string): boolean {
    return this.types.has(typeName)
  }
}
