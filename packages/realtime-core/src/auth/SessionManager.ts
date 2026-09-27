import type { GetTokenResponse } from '../types/auth'
import logger from '../utils/logger'

const STORAGE_KEY = 'chat_auth_data'

/** 会话数据（含过期时间） */
export interface StoredSessionData extends GetTokenResponse {
  expireAt: number
}

/** 会话持久化管理器（基于 localStorage） */
export class SessionManager {
  /** 保存认证数据到 localStorage */
  saveAuthData(data: GetTokenResponse): void {
    try {
      const storageData: StoredSessionData = {
        ...data,
        expireAt: Date.now() + data.expireTime * 1000,
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(storageData))
    } catch (e) {
      logger.warn('Session', '保存认证数据失败:', e)
    }
  }

  /** 从 localStorage 加载认证数据（过期则返回 null） */
  loadAuthData(): StoredSessionData | null {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) return null

      const data: StoredSessionData = JSON.parse(stored)
      // 提前 5 分钟视为过期
      if (data.expireAt && data.expireAt - 5 * 60 * 1000 < Date.now()) {
        localStorage.removeItem(STORAGE_KEY)
        return null
      }
      return data
    } catch (e) {
      logger.warn('Session', '加载认证数据失败:', e)
      return null
    }
  }

  /** 清除认证数据 */
  clearAuthData(): void {
    localStorage.removeItem(STORAGE_KEY)
  }

  /** 更新本地存储中的用户资料 */
  updateUserProfile(updates: { nickname?: string; avatar?: string }): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const data = JSON.parse(stored)
        if (data.user) {
          if (updates.nickname !== undefined) data.user.nickname = updates.nickname
          if (updates.avatar !== undefined) data.user.avatar = updates.avatar
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
        }
      }
    } catch (e) {
      logger.warn('Session', '更新本地存储失败:', e)
    }
  }
}
