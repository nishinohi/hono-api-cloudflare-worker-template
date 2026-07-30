import type { NotFoundHandler } from 'hono'
import { failure } from '../lib/response'
import type { AppEnv } from '../types/env'
import { ErrorCode } from './app-error'

/** 未定義ルートへのアクセスを ApiFailure 形式で返す。 */
export const notFoundHandler: NotFoundHandler<AppEnv> = (c) =>
  c.json(failure(ErrorCode.NotFound, `Route not found: ${c.req.method} ${c.req.path}`), 404)
