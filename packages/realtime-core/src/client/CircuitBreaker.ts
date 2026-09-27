import logger from '../utils/logger'

/** 熔断器状态 */
export enum CircuitState {
  /** 关闭状态：正常通行，记录失败次数 */
  Closed = 'Closed',
  /** 打开状态：失败达到阈值，拒绝请求 */
  Open = 'Open',
  /** 半开状态：超时后探测，尝试少量请求 */
  HalfOpen = 'HalfOpen',
}

/** 熔断器配置 */
export interface CircuitBreakerOptions {
  /** 失败阈值，达到后熔断器打开，默认 10 */
  failureThreshold?: number
  /** 重置超时时间（毫秒），打开状态持续多久后进入半开，默认 60000 */
  resetTimeout?: number
  /** 半开状态下成功阈值，达到后熔断器关闭，默认 3 */
  successThreshold?: number
}

/** 熔断器状态变化事件数据 */
export interface CircuitStateChangedData {
  from: CircuitState
  to: CircuitState
}

/**
 * 熔断器
 * 三态模式：Closed -> Open -> HalfOpen -> Closed
 */
export class CircuitBreaker {
  private readonly failureThreshold: number
  private readonly resetTimeout: number
  private readonly successThreshold: number

  private _state: CircuitState = CircuitState.Closed
  private failureCount = 0
  private successCount = 0
  private openTimestamp = 0
  private stateChangeListeners: Set<(data: CircuitStateChangedData) => void> = new Set()

  constructor(options: CircuitBreakerOptions = {}) {
    this.failureThreshold = options.failureThreshold ?? 10
    this.resetTimeout = options.resetTimeout ?? 60000
    this.successThreshold = options.successThreshold ?? 3
  }

  /** 当前熔断器状态 */
  get state(): CircuitState {
    // 如果处于打开状态且已超过重置时间，自动转为半开
    if (this._state === CircuitState.Open) {
      const elapsed = Date.now() - this.openTimestamp
      if (elapsed >= this.resetTimeout) {
        this.transitionTo(CircuitState.HalfOpen)
      }
    }
    return this._state
  }

  /** 注册状态变化监听 */
  onStateChanged(callback: (data: CircuitStateChangedData) => void): void {
    this.stateChangeListeners.add(callback)
  }

  /** 移除状态变化监听 */
  offStateChanged(callback: (data: CircuitStateChangedData) => void): void {
    this.stateChangeListeners.delete(callback)
  }

  /** 切换状态 */
  private transitionTo(newState: CircuitState): void {
    if (this._state === newState) return

    const from = this._state
    this._state = newState

    logger.info('CircuitBreaker', `状态变化: ${from} -> ${newState}`)

    // 进入半开状态时重置成功计数
    if (newState === CircuitState.HalfOpen) {
      this.successCount = 0
    }
    // 进入关闭状态时重置失败计数
    if (newState === CircuitState.Closed) {
      this.failureCount = 0
    }
    // 进入打开状态时记录时间戳
    if (newState === CircuitState.Open) {
      this.openTimestamp = Date.now()
    }

    // 通知监听者
    this.stateChangeListeners.forEach((cb) => cb({ from, to: newState }))
  }

  /** 记录成功 */
  recordSuccess(): void {
    // 先检查状态（可能自动从 Open 转为 HalfOpen）
    const currentState = this.state

    if (currentState === CircuitState.HalfOpen) {
      this.successCount++
      logger.debug('CircuitBreaker', `半开状态记录成功: ${this.successCount}/${this.successThreshold}`)

      if (this.successCount >= this.successThreshold) {
        this.transitionTo(CircuitState.Closed)
      }
    } else if (currentState === CircuitState.Closed) {
      // 关闭状态下成功，重置失败计数
      if (this.failureCount > 0) {
        this.failureCount = 0
        logger.debug('CircuitBreaker', '关闭状态记录成功，失败计数已重置')
      }
    }
  }

  /** 记录失败，达到阈值则打开 */
  recordFailure(): void {
    // 先检查状态（可能自动从 Open 转为 HalfOpen）
    const currentState = this.state

    if (currentState === CircuitState.HalfOpen) {
      // 半开状态下失败，立即重新打开
      logger.warn('CircuitBreaker', '半开状态记录失败，重新打开熔断器')
      this.transitionTo(CircuitState.Open)
    } else if (currentState === CircuitState.Closed) {
      this.failureCount++
      logger.debug('CircuitBreaker', `关闭状态记录失败: ${this.failureCount}/${this.failureThreshold}`)

      if (this.failureCount >= this.failureThreshold) {
        logger.warn('CircuitBreaker', `失败次数达到阈值 ${this.failureThreshold}，熔断器打开`)
        this.transitionTo(CircuitState.Open)
      }
    }
  }

  /** 是否可以尝试（半开时探测） */
  canAttempt(): boolean {
    const currentState = this.state
    return currentState !== CircuitState.Open
  }

  /** 重置为关闭状态 */
  reset(): void {
    this.failureCount = 0
    this.successCount = 0
    this.openTimestamp = 0
    if (this._state !== CircuitState.Closed) {
      this.transitionTo(CircuitState.Closed)
    } else {
      logger.debug('CircuitBreaker', '熔断器已重置')
    }
  }
}
