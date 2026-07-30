import { Hono } from 'hono'
import { success } from '../lib/response'
import type { AppEnv } from '../types/env'

/** 死活監視用のエンドポイント。認証は不要。 */
export const healthRoute = new Hono<AppEnv>().get('/', (c) =>
  c.json(
    success({
      status: 'ok',
      environment: c.env.ENVIRONMENT,
      requestId: c.get('requestId'),
      timestamp: new Date().toISOString(),
    }),
  ),
)
