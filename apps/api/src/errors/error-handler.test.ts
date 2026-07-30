import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AppEnv } from '../types/env'
import { AppError, ErrorCode } from './app-error'
import { errorHandler } from './error-handler'

const buildApp = (thrown: unknown): Hono<AppEnv> => {
  const app = new Hono<AppEnv>()
  app.get('/boom', () => {
    throw thrown
  })
  app.onError(errorHandler)
  return app
}

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('errorHandler', () => {
  it('AppError は status と code をそのまま返す', async () => {
    const app = buildApp(new AppError(404, ErrorCode.NotFound, 'ありません'))
    const res = await app.request('/boom')

    expect(res.status).toBe(404)
    await expect(res.json()).resolves.toEqual({
      success: false,
      error: { code: 'NOT_FOUND', message: 'ありません' },
    })
  })

  it('AppError の details を含める', async () => {
    const details = [{ path: 'title', message: '必須です' }]
    const app = buildApp(new AppError(422, ErrorCode.ValidationFailed, '不正です', { details }))
    const res = await app.request('/boom')

    await expect(res.json()).resolves.toMatchObject({ error: { details } })
  })

  it('素の HTTPException は BAD_REQUEST として整形する', async () => {
    const app = buildApp(new HTTPException(401, { message: '未認証です' }))
    const res = await app.request('/boom')

    expect(res.status).toBe(401)
    await expect(res.json()).resolves.toEqual({
      success: false,
      error: { code: 'BAD_REQUEST', message: '未認証です' },
    })
  })

  it('res 付きの HTTPException はその Response を返す', async () => {
    const custom = new Response('custom body', { status: 418 })
    const app = buildApp(new HTTPException(418, { res: custom }))
    const res = await app.request('/boom')

    expect(res.status).toBe(418)
    await expect(res.text()).resolves.toBe('custom body')
  })

  it('想定外のエラーは 500 にして内容を隠す', async () => {
    const app = buildApp(new Error('データベース接続文字列が漏れる可能性のある内容'))
    const res = await app.request('/boom')

    expect(res.status).toBe(500)
    await expect(res.json()).resolves.toEqual({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Internal Server Error' },
    })
    expect(console.error).toHaveBeenCalledTimes(1)
  })
})
