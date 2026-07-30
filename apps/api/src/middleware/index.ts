import type { Hono } from 'hono'
import { logger } from 'hono/logger'
import { requestId } from 'hono/request-id'
import { secureHeaders } from 'hono/secure-headers'
import { honoLogPrinter } from '../lib/logger'
import type { AppEnv } from '../types/env'
import { corsMiddleware } from './cors'

/**
 * 共通ミドルウェアを登録する。
 *
 * 登録順に意味がある:
 *   requestId    … 後続のログとレスポンスで参照する ID を最初に採番する
 *   secureHeaders… セキュリティヘッダーを常に付与する
 *   logger       … requestId 採番後にアクセスログを出す
 *   cors         … プリフライトへ即座に応答する
 */
export const registerMiddleware = (app: Hono<AppEnv>): Hono<AppEnv> => {
  app.use('*', requestId())
  app.use('*', secureHeaders())
  app.use('*', logger(honoLogPrinter))
  app.use('*', corsMiddleware())
  return app
}
