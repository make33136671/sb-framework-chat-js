/** 日志工具，logLevel 通过 setLogLevel() 注入 */
let currentLogLevel = 2

export function setLogLevel(level: number): void {
  currentLogLevel = level
}

export function getLogLevel(): number {
  return currentLogLevel
}

const logger = {
  verbose: (tag: string, ...args: unknown[]) => currentLogLevel >= 4 && console.log(`[${tag}]`, ...args),
  debug:   (tag: string, ...args: unknown[]) => currentLogLevel >= 3 && console.log(`[${tag}]`, ...args),
  info:    (tag: string, ...args: unknown[]) => currentLogLevel >= 2 && console.log(`[${tag}]`, ...args),
  warn:    (tag: string, ...args: unknown[]) => currentLogLevel >= 1 && console.warn(`[${tag}]`, ...args),
  error:   (tag: string, ...args: unknown[]) => currentLogLevel >= 0 && console.error(`[${tag}]`, ...args),
}

export default logger
