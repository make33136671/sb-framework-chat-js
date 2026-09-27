import type {
  GetTokenRequest,
  GetTokenResponse,
  ApiResponse,
  PlatformType,
} from '../types/auth'
import { getClientId } from '../utils/clientId'
import { collectDeviceInfo } from '../utils/deviceInfo'

/** 认证服务，处理 Token 获取和用户信息更新 */
export class AuthService {
  private baseURL: string

  constructor(baseURL: string) {
    this.baseURL = baseURL
  }

  /** 获取 Token（完整参数版） */
  async getToken(request: GetTokenRequest): Promise<GetTokenResponse> {
    const formData = new FormData()
    formData.append('platformKey', request.platformKey)

    if (request.deviceId) {
      formData.append('deviceId', request.deviceId)
    }
    if (request.userId) {
      formData.append('userId', request.userId)
    }
    if (request.nickname) {
      formData.append('nickname', request.nickname)
    }
    if (request.avatar) {
      formData.append('avatar', request.avatar)
    }
    if (request.metadata) {
      formData.append('metadata', request.metadata)
    }

    formData.append('platformType', (request.platformType ?? 0).toString())

    if (request.source) {
      formData.append('source', request.source)
    }

    const clientId = request.clientId || getClientId()
    formData.append('clientId', clientId)

    try {
      const deviceInfo = request.deviceInfo || JSON.stringify(collectDeviceInfo())
      formData.append('deviceInfo', deviceInfo)
    } catch {
      // ignore
    }

    const response = await fetch(`${this.baseURL}/api/ChatAuth/GetToken`, {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      throw new Error(`HTTP 错误: ${response.status}`)
    }

    const result: ApiResponse<GetTokenResponse> = await response.json()

    if (result.code !== 0) {
      throw new Error(result.message || '获取 Token 失败')
    }

    return result.data
  }

  /** 获取 Token（简化参数版） */
  async getTokenSimple(
    platformKey: string,
    userId?: string,
    platformType: PlatformType = 0,
    options?: {
      nickname?: string
      avatar?: string
      deviceId?: string
      metadata?: string
      source?: string
    }
  ): Promise<GetTokenResponse> {
    return this.getToken({
      platformKey,
      userId,
      platformType,
      nickname: options?.nickname,
      avatar: options?.avatar,
      deviceId: options?.deviceId,
      metadata: options?.metadata,
      source: options?.source,
    })
  }

  /** 更新用户信息 */
  async updateUserInfo(
    platformKey: string,
    deviceId: string,
    userId?: string,
    nickname?: string,
    avatar?: string
  ): Promise<void> {
    const formData = new FormData()
    formData.append('PlatformKey', platformKey)
    formData.append('DeviceId', deviceId)

    if (userId) formData.append('UserId', userId)
    if (nickname) formData.append('Nickname', nickname)
    if (avatar) formData.append('Avatar', avatar)

    const response = await fetch(`${this.baseURL}/api/ChatAuth/UpdateUserInfo`, {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      throw new Error(`HTTP 错误: ${response.status}`)
    }

    const result: ApiResponse = await response.json()

    if (result.code !== 0) {
      throw new Error(result.message || '更新用户信息失败')
    }
  }
}
