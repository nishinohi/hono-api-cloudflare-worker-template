import { Hono } from 'hono'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { errorHandler } from '../../errors/error-handler'
import type { AppEnv } from '../../types/env'
import { createInMemoryTaskRepository } from './repository'
import { createTasksRoute } from './index'

const buildApp = (): Hono<AppEnv> => {
  const app = new Hono<AppEnv>()
  app.route('/api/tasks', createTasksRoute(createInMemoryTaskRepository()))
  app.onError(errorHandler)
  return app
}

const postTask = (app: Hono<AppEnv>, body: unknown) =>
  app.request('/api/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('POST /api/tasks', () => {
  it('201 と作成したタスクを返す', async () => {
    const res = await postTask(buildApp(), { title: '買い物' })

    expect(res.status).toBe(201)
    await expect(res.json()).resolves.toMatchObject({
      success: true,
      data: { title: '買い物', status: 'todo' },
    })
  })

  it('不正な JSON は 400 と BAD_REQUEST を返す', async () => {
    const res = await postTask(buildApp(), 'not-json')

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toMatchObject({ error: { code: 'BAD_REQUEST' } })
  })

  it('検証エラーは 422 と詳細を返す', async () => {
    const res = await postTask(buildApp(), { title: '' })

    expect(res.status).toBe(422)
    await expect(res.json()).resolves.toMatchObject({
      error: { code: 'VALIDATION_FAILED', details: [{ path: 'title' }] },
    })
  })
})

describe('GET /api/tasks', () => {
  it('作成したタスクを一覧で返す', async () => {
    const app = buildApp()
    await postTask(app, { title: '買い物' })

    const res = await app.request('/api/tasks')
    expect(res.status).toBe(200)
    const body = (await res.json()) as { data: unknown[] }
    expect(body.data).toHaveLength(1)
  })

  it('テストごとにリポジトリが独立している', async () => {
    const res = await buildApp().request('/api/tasks')
    await expect(res.json()).resolves.toEqual({ success: true, data: [] })
  })
})

describe('GET /api/tasks/:id', () => {
  it('存在するタスクを返す', async () => {
    const app = buildApp()
    const created = (await (await postTask(app, { title: '買い物' })).json()) as {
      data: { id: string }
    }

    const res = await app.request(`/api/tasks/${created.data.id}`)
    expect(res.status).toBe(200)
  })

  it('存在しない id は 404 を返す', async () => {
    const res = await buildApp().request('/api/tasks/missing')

    expect(res.status).toBe(404)
    await expect(res.json()).resolves.toMatchObject({ error: { code: 'NOT_FOUND' } })
  })
})

describe('PATCH /api/tasks/:id', () => {
  const patch = (app: Hono<AppEnv>, id: string, body: unknown) =>
    app.request(`/api/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

  it('status を更新する', async () => {
    const app = buildApp()
    const created = (await (await postTask(app, { title: '買い物' })).json()) as {
      data: { id: string }
    }

    const res = await patch(app, created.data.id, { status: 'done' })
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toMatchObject({ data: { status: 'done' } })
  })

  it('存在しない id は 404 を返す', async () => {
    const res = await patch(buildApp(), 'missing', { status: 'done' })
    expect(res.status).toBe(404)
  })

  it('検証エラーは 422 を返す', async () => {
    const res = await patch(buildApp(), 'missing', {})
    expect(res.status).toBe(422)
  })
})

describe('DELETE /api/tasks/:id', () => {
  it('204 を返してタスクを削除する', async () => {
    const app = buildApp()
    const created = (await (await postTask(app, { title: '買い物' })).json()) as {
      data: { id: string }
    }

    const res = await app.request(`/api/tasks/${created.data.id}`, { method: 'DELETE' })
    expect(res.status).toBe(204)

    await expect((await app.request('/api/tasks')).json()).resolves.toEqual({
      success: true,
      data: [],
    })
  })

  it('存在しない id は 404 を返す', async () => {
    const res = await buildApp().request('/api/tasks/missing', { method: 'DELETE' })
    expect(res.status).toBe(404)
  })
})
