import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { AppError, ErrorCode } from '../errors/app-error'
import { rejectInvalid, toErrorDetails } from './validator'

describe('toErrorDetails', () => {
  it('すべての issue を path と message に変換する', () => {
    const details = toErrorDetails({
      issues: [
        { path: ['title'], message: 'title が不正です' },
        { path: ['items', 0, 'name'], message: 'name が不正です' },
      ],
    })

    expect(details).toEqual([
      { path: 'title', message: 'title が不正です' },
      { path: 'items.0.name', message: 'name が不正です' },
    ])
  })

  it('path が空の issue は path を空文字にする', () => {
    expect(toErrorDetails({ issues: [{ path: [], message: '全体が不正です' }] })).toEqual([
      { path: '', message: '全体が不正です' },
    ])
  })

  it('実際の ZodError を受け取れる', () => {
    const result = z.object({ title: z.string() }).safeParse({})

    expect(result.success).toBe(false)
    if (!result.success) expect(toErrorDetails(result.error)).toMatchObject([{ path: 'title' }])
  })
})

describe('rejectInvalid', () => {
  it('検証に成功した結果は素通しする', () => {
    expect(() => rejectInvalid({ success: true })).not.toThrow()
  })

  it('検証に失敗したら 422 の AppError を投げる', () => {
    const failure = {
      success: false,
      error: { issues: [{ path: ['title'], message: 'title が不正です' }] },
    }

    try {
      rejectInvalid(failure)
      expect.unreachable('AppError が投げられていない')
    } catch (error) {
      expect(error).toBeInstanceOf(AppError)
      const appError = error as AppError
      expect(appError.status).toBe(422)
      expect(appError.code).toBe(ErrorCode.ValidationFailed)
      expect(appError.details).toEqual([{ path: 'title', message: 'title が不正です' }])
    }
  })
})
