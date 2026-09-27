const CLIENT_ID_KEY = 'sb_client_id'

function generateClientId(): string {
  const timestamp = Date.now().toString(36)
  const randomPart = Math.random().toString(36).substring(2, 15)
  const randomPart2 = Math.random().toString(36).substring(2, 15)
  return `cid_${timestamp}_${randomPart}${randomPart2}`
}

/** 获取或生成客户端 ID（持久化到 localStorage） */
export function getClientId(): string {
  try {
    let clientId = localStorage.getItem(CLIENT_ID_KEY)
    if (!clientId) {
      clientId = generateClientId()
      localStorage.setItem(CLIENT_ID_KEY, clientId)
    }
    return clientId
  } catch {
    return generateClientId()
  }
}

/** 重置客户端 ID */
export function resetClientId(): string {
  const newClientId = generateClientId()
  try {
    localStorage.setItem(CLIENT_ID_KEY, newClientId)
  } catch {
    // ignore
  }
  return newClientId
}

/** 检查是否已有客户端 ID */
export function hasClientId(): boolean {
  try {
    return !!localStorage.getItem(CLIENT_ID_KEY)
  } catch {
    return false
  }
}
