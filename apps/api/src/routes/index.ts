import type { Hono } from 'hono'
import type { AppEnv } from '../types/env'
import { healthRoute } from './health'
import { tasksRoute } from './tasks'

/** ルーターをアプリへ登録する。ルートを追加するときはここに 1 行足す。 */
export const registerRoutes = (app: Hono<AppEnv>): Hono<AppEnv> => {
  app.route('/health', healthRoute)
  app.route('/api/tasks', tasksRoute)
  return app
}
