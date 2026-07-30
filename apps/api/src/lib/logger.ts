export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export type LogFields = Readonly<Record<string, unknown>>

/**
 * 構造化ログを 1 行の JSON として出力する。
 *
 * Workers のログは Cloudflare の observability に取り込まれるため、
 * JSON で出しておくとダッシュボード側で検索しやすい。
 * console.log は ESLint で禁止しているので、出力はこのモジュールに集約する。
 */
const emit = (level: LogLevel, message: string, fields: LogFields): void => {
  const line = JSON.stringify({
    level,
    message,
    timestamp: new Date().toISOString(),
    ...fields,
  })

  if (level === 'error') {
    console.error(line)
    return
  }
  if (level === 'warn') {
    console.warn(line)
    return
  }
  console.info(line)
}

export const log = (level: LogLevel, message: string, fields: LogFields = {}): void => emit(level, message, fields)

/** hono/logger の printFn として渡すためのアダプター。 */
export const honoLogPrinter = (message: string, ...rest: readonly string[]): void =>
  emit('info', [message, ...rest].join(' '), { source: 'hono/logger' })

/** unknown な例外をログ用のフィールドへ安全に展開する。 */
export const serializeError = (error: unknown): LogFields =>
  error instanceof Error
    ? { errorName: error.name, errorMessage: error.message, stack: error.stack }
    : { errorName: 'UnknownError', errorMessage: String(error) }
