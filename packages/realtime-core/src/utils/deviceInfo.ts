/** 客户端设备信息 */
export interface ClientDeviceInfo {
  userAgent: string
  platform: string
  screenWidth: number
  screenHeight: number
  viewportWidth: number
  viewportHeight: number
  devicePixelRatio: number
  colorDepth: number
  connectionType?: string
  effectiveType?: string
  downlink?: number
  rtt?: number
  language: string
  languages: string[]
  timezone: string
  timezoneOffset: number
  currentUrl: string
  pageTitle: string
  referrer: string
  touchSupport: boolean
  maxTouchPoints: number
  deviceMemory?: number
  hardwareConcurrency?: number
  cookieEnabled: boolean
  prefersDarkMode: boolean
  online: boolean
}

interface NetworkInformation {
  type?: string
  effectiveType?: string
  downlink?: number
  rtt?: number
}

interface NavigatorExtended extends Navigator {
  deviceMemory?: number
  connection?: NetworkInformation
  mozConnection?: NetworkInformation
  webkitConnection?: NetworkInformation
}

function safeGet<T>(getter: () => T): T | undefined
function safeGet<T>(getter: () => T, defaultValue: T): T
function safeGet<T>(getter: () => T, defaultValue?: T): T | undefined {
  try {
    const value = getter()
    return value ?? defaultValue
  } catch {
    return defaultValue
  }
}

/** 采集设备信息 */
export function collectDeviceInfo(): ClientDeviceInfo {
  const nav = navigator as NavigatorExtended
  const conn = nav.connection || nav.mozConnection || nav.webkitConnection

  return {
    userAgent: safeGet(() => navigator.userAgent, ''),
    platform: safeGet(() => navigator.platform, ''),
    screenWidth: safeGet(() => screen.width, 0),
    screenHeight: safeGet(() => screen.height, 0),
    viewportWidth: safeGet(() => window.innerWidth, 0),
    viewportHeight: safeGet(() => window.innerHeight, 0),
    devicePixelRatio: safeGet(() => window.devicePixelRatio, 1),
    colorDepth: safeGet(() => screen.colorDepth, 0),
    connectionType: safeGet(() => conn?.type),
    effectiveType: safeGet(() => conn?.effectiveType),
    downlink: safeGet(() => conn?.downlink),
    rtt: safeGet(() => conn?.rtt),
    language: safeGet(() => navigator.language, ''),
    languages: safeGet(() => [...(navigator.languages || [])], []),
    timezone: safeGet(() => Intl.DateTimeFormat().resolvedOptions().timeZone, ''),
    timezoneOffset: safeGet(() => new Date().getTimezoneOffset(), 0),
    currentUrl: safeGet(() => window.location.href, ''),
    pageTitle: safeGet(() => document.title, ''),
    referrer: safeGet(() => document.referrer, ''),
    touchSupport: safeGet(() => 'ontouchstart' in window || navigator.maxTouchPoints > 0, false),
    maxTouchPoints: safeGet(() => navigator.maxTouchPoints, 0),
    deviceMemory: safeGet(() => nav.deviceMemory),
    hardwareConcurrency: safeGet(() => navigator.hardwareConcurrency),
    cookieEnabled: safeGet(() => navigator.cookieEnabled, true),
    prefersDarkMode: safeGet(() => window.matchMedia('(prefers-color-scheme: dark)').matches, false),
    online: safeGet(() => navigator.onLine, true),
  }
}
