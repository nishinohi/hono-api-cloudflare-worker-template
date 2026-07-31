import { Hono } from 'hono'
import { requestId } from 'hono/request-id'
import { describe, expect, it } from 'vitest'
import type { AppEnv } from '../types/env'
import { healthRoute } from './health'

const testEnv: Env = {
  ENVIRONMENT: 'local',
  CORS_ALLOWED_ORIGINS: '*',
  LOG_LEVEL: 'debug',
}

const buildApp = (): Hono<AppEnv> => {
  const app = new Hono<AppEnv>()
  app.use('*', requestId())
  app.route('/health', healthRoute)
  return app
}

describe('GET /health', () => {
  it('200 と稼働情報を返す', async () => {
    const res = await buildApp().request('/health', {}, testEnv)

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toMatchObject({
      success: true,
      data: { status: 'ok', environment: 'local' },
    })
  })

  it('requestId とタイムスタンプを含める', async () => {
    const res = await buildApp().request('/health', {}, testEnv)
    const body = (await res.json()) as { data: { requestId: string; timestamp: string } }

    expect(body.data.requestId).toBeTypeOf('string')
    expect(body.data.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })
})
