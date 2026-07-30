import { cors } from 'hono/cors'
import { createMiddleware } from 'hono/factory'
import type { AppEnv } from '../types/env'

/**
 * CORS_ALLOWED_ORIGINS をオリジンの配列へ変換する。
 *
 * 未設定・空文字・"*" の場合はすべてのオリジンを許可する。
 * それ以外はカンマ区切りとして解釈する。
 */
export const parseAllowedOrigins = (raw: string | undefined): string | string[] => {
  const trimmed = raw?.trim()
  if (!trimmed || trimmed === '*') return '*'

  const origins = trimmed
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0)

  return origins.length > 0 ? origins : '*'
}

/**
 * 環境変数を参照するため、リクエストごとに cors() を組み立てる。
 * c.env はハンドラー実行時にしか参照できないので createMiddleware でラップしている。
 */
export const corsMiddleware = () =>
  createMiddleware<AppEnv>((c, next) =>
    cors({
      origin: parseAllowedOrigins(c.env.CORS_ALLOWED_ORIGINS),
      allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
      exposeHeaders: ['X-Request-Id'],
      maxAge: 600,
    })(c, next),
  )
