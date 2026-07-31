import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp } from './app'

const testEnv: Env = {
  ENVIRONMENT: 'local',
  CORS_ALLOWED_ORIGINS: '*',
  LOG_LEVEL: 'debug',
}

// wrangler types は vars の値から literal union を生成するため、
// wrangler.jsonc に定義済みの値をそのまま使う。
const ALLOWED_ORIGIN = 'https://staging.example.com'
const restrictedEnv: Env = { ...testEnv, CORS_ALLOWED_ORIGINS: ALLOWED_ORIGIN }

beforeEach(() => {
  // hono/logger の出力でテスト結果が埋もれないよう抑制する
  vi.spyOn(console, 'info').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('createApp', () => {
  it('GET /health を配線している', async () => {
    const res = await createApp().request('/health', {}, testEnv)
    expect(res.status).toBe(200)
  })

  it('/api/tasks を配線している', async () => {
    const res = await createApp().request('/api/tasks', {}, testEnv)
    expect(res.status).toBe(200)
  })

  it('未定義ルートは 404 と NOT_FOUND を返す', async () => {
    const res = await createApp().request('/unknown', {}, testEnv)

    expect(res.status).toBe(404)
    await expect(res.json()).resolves.toMatchObject({
      success: false,
      error: { code: 'NOT_FOUND' },
    })
  })

  it('X-Request-Id ヘッダーを引き継ぐ', async () => {
    const res = await createApp().request('/health', { headers: { 'X-Request-Id': 'given-request-id' } }, testEnv)

    await expect(res.json()).resolves.toMatchObject({ data: { requestId: 'given-request-id' } })
    expect(res.headers.get('X-Request-Id')).toBe('given-request-id')
  })

  it('secureHeaders を付与する', async () => {
    const res = await createApp().request('/health', {}, testEnv)
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff')
  })

  it('CORS_ALLOWED_ORIGINS が * なら任意のオリジンを許可する', async () => {
    const res = await createApp().request('/health', { headers: { Origin: 'https://any.example.com' } }, testEnv)

    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*')
  })

  it('許可オリジンを指定するとそれ以外を許可しない', async () => {
    const allowed = await createApp().request('/health', { headers: { Origin: ALLOWED_ORIGIN } }, restrictedEnv)
    expect(allowed.headers.get('Access-Control-Allow-Origin')).toBe(ALLOWED_ORIGIN)

    const denied = await createApp().request(
      '/health',
      { headers: { Origin: 'https://evil.example.com' } },
      restrictedEnv,
    )
    expect(denied.headers.get('Access-Control-Allow-Origin')).toBeNull()
  })

  it('プリフライトに応答する', async () => {
    const res = await createApp().request(
      '/api/tasks',
      { method: 'OPTIONS', headers: { Origin: 'https://any.example.com' } },
      testEnv,
    )

    expect(res.status).toBe(204)
    expect(res.headers.get('Access-Control-Allow-Methods')).toContain('POST')
  })
})
