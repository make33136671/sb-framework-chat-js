import type { AuthService } from './AuthService'
import type { GetTokenRequest } from '../types/auth'
import logger from '../utils/logger'

/** RealtimeClient 接口（避免循环依赖） */
interface IRealtimeClient {
  login(userId: string, token: string): Promise<boolean>
}

/** RefreshSession 响应 */
interface RefreshSessionResponse {
  token: string
  expireTimeSeconds: number
  agentUserId: string | null
  agentOnline: boolean
}

/** Token 自动续期管理器 */
export class TokenRefresher {
  private authService: AuthService
  private client: IRealtimeClient
  private lastLoginRequest: GetTokenRequest | null = null
  private active = false
  private baseURL: string = ''
  private chatUserId: string = ''
  private clientId: string = ''
  private platformKey: string = ''

  /** 当 agent 因滑落而变化时触发 */
  onAgentChanged: ((newAgentUserId: string) => void) | null = null

  constructor(authService: AuthService, client: IRealtimeClient) {
    this.authService = authService
    this.client = client
  }

  /** 设置上次登录请求参数（用于自动续期） */
  setLastLoginRequest(request: GetTokenRequest): void {
    this.lastLoginRequest = request
    this.active = true
  }

  /** 设置容灾恢复所需的参数 */
  setSessionInfo(info: {
    baseURL: string
    chatUserId: string
    clientId: string
    platformKey: string
  }): void {
    this.baseURL = info.baseURL
    this.chatUserId = info.chatUserId
    this.clientId = info.clientId
    this.platformKey = info.platformKey
  }

  /** Token 过期时的自动刷新回调 */
  async refresh(): Promise<void> {
    if (!this.lastLoginRequest) {
      throw new Error('无法刷新：缺少登录参数')
    }

    logger.info('TokenRefresher', '正在自动刷新 Token...')

    try {
      const newAuth = await this.authService.getToken(this.lastLoginRequest)
      await this.client.login(newAuth.userID, newAuth.token)
      logger.info('TokenRefresher', 'Token 刷新成功')
    } catch (err) {
      logger.warn('TokenRefresher', '标准刷新失败，尝试 RefreshSession 容灾恢复...')
      await this.refreshSession()
    }
  }

  /** 容灾恢复：调用 RefreshSession 做完整重置 */
  async refreshSession(): Promise<RefreshSessionResponse> {
    if (!this.baseURL || !this.chatUserId) {
      throw new Error('无法容灾恢复：缺少 session 参数')
    }

    logger.info('TokenRefresher', '正在调用 RefreshSession...')

    const response = await fetch(`${this.baseURL}/api/ChatAuth/RefreshSession`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chatUserId: this.chatUserId,
        clientId: this.clientId,
        platformKey: this.platformKey,
      }),
    })

    if (!response.ok) {
      throw new Error(`RefreshSession HTTP 错误: ${response.status}`)
    }

    const result = await response.json()
    if (result.code !== 0) {
      throw new Error(result.message || 'RefreshSession 失败')
    }

    const data: RefreshSessionResponse = result.data

    await this.client.login(this.chatUserId, data.token)
    logger.info('TokenRefresher', 'RefreshSession 成功')

    if (data.agentUserId && this.onAgentChanged) {
      this.onAgentChanged(data.agentUserId)
    }

    return data
  }

  /** 是否已激活 */
  isActive(): boolean {
    return this.active
  }

  /** 停止自动续期 */
  stop(): void {
    this.lastLoginRequest = null
    this.active = false
    this.onAgentChanged = null
  }
}
