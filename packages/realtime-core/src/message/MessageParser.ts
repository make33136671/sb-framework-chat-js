/** 数据解析工具 — SignalR 返回的数据已经是对象，无需 JSON.parse */
export class MessageParser {
  /** 透传数据（SignalR 自动反序列化 JSON 为对象） */
  static parse<T>(data: unknown): T {
    if (typeof data === 'string') {
      try {
        return JSON.parse(data) as T
      } catch {
        return data as T
      }
    }
    return data as T
  }
}
