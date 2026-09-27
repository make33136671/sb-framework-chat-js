import type { RealtimeClient } from '../client/RealtimeClient'

/** 插件接口（预留） */
export interface RealtimePlugin {
  /** 插件名称 */
  name: string
  /** 插件版本 */
  version: string
  /** 安装插件 */
  install(client: RealtimeClient): void
  /** 卸载插件 */
  uninstall?(): void
}
