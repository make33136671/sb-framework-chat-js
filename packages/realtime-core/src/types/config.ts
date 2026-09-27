/** Realtime 核心库配置 */
export interface RealtimeCoreConfig {
  /** Realtime Hub WebSocket 地址（可选，支持服务端下发） */
  wsAddr?: string
  /** 业务后端 API 地址 */
  baseURL: string
  /** 平台密钥 */
  platformKey: string
  /** 日志级别（0=Error, 1=Warn, 2=Info, 3=Debug, 4=Verbose） */
  logLevel?: number

  /** 重连配置 */
  reconnect?: {
    /** 最大重试次数，默认 10 */
    maxRetries?: number
    /** 基础延迟（毫秒），默认 1000 */
    baseDelay?: number
    /** 最大延迟（毫秒），默认 30000 */
    maxDelay?: number
    /** 抖动因子（0~1），默认 0.2 */
    jitterFactor?: number
  }

  /** 熔断器配置 */
  circuitBreaker?: {
    /** 失败阈值，达到后熔断器打开，默认 10 */
    failureThreshold?: number
    /** 重置超时时间（毫秒），打开状态持续多久后进入半开，默认 60000 */
    resetTimeout?: number
    /** 半开状态下成功阈值，达到后熔断器关闭，默认 3 */
    successThreshold?: number
  }

  /** 心跳间隔（毫秒），默认 15000 */
  heartbeatInterval?: number
}
