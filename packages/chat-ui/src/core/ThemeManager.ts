/** 主题配置 */
export interface ThemeConfig {
  '--chat-bg': string
  '--chat-bubble-self-start': string
  '--chat-bubble-self-end': string
  '--chat-bubble-other': string
  '--chat-text-primary': string
  '--chat-text-secondary': string
  '--chat-text-self': string
  '--chat-border': string
  '--chat-input-bg': string
  '--chat-avatar-bg': string
  '--chat-avatar-self-start': string
  '--chat-avatar-self-end': string
  '--chat-error': string
  '--chat-accent-start': string
  '--chat-accent-end': string
}

const lightTheme: ThemeConfig = {
  '--chat-bg': '#f5f7fb',
  '--chat-bubble-self-start': '#667eea',
  '--chat-bubble-self-end': '#764ba2',
  '--chat-bubble-other': '#ffffff',
  '--chat-text-primary': '#333333',
  '--chat-text-secondary': '#666666',
  '--chat-text-self': '#ffffff',
  '--chat-border': '#e8e8e8',
  '--chat-input-bg': '#ffffff',
  '--chat-avatar-bg': '#e8e8e8',
  '--chat-avatar-self-start': '#667eea',
  '--chat-avatar-self-end': '#764ba2',
  '--chat-error': '#ff4d4f',
  '--chat-accent-start': '#667eea',
  '--chat-accent-end': '#764ba2',
}

const darkTheme: ThemeConfig = {
  '--chat-bg': '#1a1a2e',
  '--chat-bubble-self-start': '#667eea',
  '--chat-bubble-self-end': '#764ba2',
  '--chat-bubble-other': '#2d2d44',
  '--chat-text-primary': '#e0e0e0',
  '--chat-text-secondary': '#999999',
  '--chat-text-self': '#ffffff',
  '--chat-border': '#3d3d5c',
  '--chat-input-bg': '#2d2d44',
  '--chat-avatar-bg': '#3d3d5c',
  '--chat-avatar-self-start': '#667eea',
  '--chat-avatar-self-end': '#764ba2',
  '--chat-error': '#ff4d4f',
  '--chat-accent-start': '#667eea',
  '--chat-accent-end': '#764ba2',
}

/** 主题管理器 */
export class ThemeManager {
  private currentTheme: 'light' | 'dark' = 'light'
  private container: HTMLElement | null = null

  /** 绑定容器元素 */
  bind(container: HTMLElement): void {
    this.container = container
    this.applyTheme()
  }

  /** 设置主题 */
  setTheme(theme: 'light' | 'dark'): void {
    this.currentTheme = theme
    this.applyTheme()
  }

  /** 获取当前主题 */
  getTheme(): 'light' | 'dark' {
    return this.currentTheme
  }

  /** 应用主题到容器 */
  private applyTheme(): void {
    if (!this.container) return
    const config = this.currentTheme === 'dark' ? darkTheme : lightTheme
    for (const [key, value] of Object.entries(config)) {
      this.container.style.setProperty(key, value)
    }
  }
}
