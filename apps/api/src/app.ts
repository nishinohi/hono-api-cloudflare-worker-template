import { Hono } from 'hono'
import { errorHandler } from './errors/error-handler'
import { notFoundHandler } from './errors/not-found-handler'
import { registerMiddleware } from './middleware'
import { registerRoutes } from './routes'
import type { AppEnv } from './types/env'

/**
 * アプリケーションを組み立てる。
 *
 * ファクトリー関数にしておくことで、テストごとにまっさらな app を生成できる。
 */
export const createApp = (): Hono<AppEnv> => {
  const app = new Hono<AppEnv>()

  registerMiddleware(app)
  registerRoutes(app)

  app.onError(errorHandler)
  app.notFound(notFoundHandler)

  return app
}
