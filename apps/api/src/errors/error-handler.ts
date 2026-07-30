import type { ErrorHandler } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { log, serializeError } from '../lib/logger'
import { failure } from '../lib/response'
import type { AppEnv } from '../types/env'
import { AppError, ErrorCode } from './app-error'

/**
 * 例外を ApiFailure 形式のレスポンスへ変換する。
 *
 * 想定内のエラー（AppError / HTTPException）は warn、
 * 想定外のエラーは error でログに残したうえで詳細を握りつぶす。
 */
export const errorHandler: ErrorHandler<AppEnv> = (err, c) => {
  const requestId = c.get('requestId')

  if (err instanceof AppError) {
    log('warn', err.message, { requestId, code: err.code, status: err.status })
    return c.json(failure(err.code, err.message, err.details), err.status)
  }

  if (err instanceof HTTPException) {
    log('warn', err.message, { requestId, status: err.status })
    // res オプション付きで throw された場合はその Response をそのまま返す
    if (err.res) return err.res
    return c.json(failure(ErrorCode.BadRequest, err.message), err.status)
  }

  log('error', 'Unhandled error', { requestId, ...serializeError(err) })
  // 想定外のエラーの内容はクライアントへ漏らさない
  return c.json(failure(ErrorCode.Internal, 'Internal Server Error'), 500)
}
