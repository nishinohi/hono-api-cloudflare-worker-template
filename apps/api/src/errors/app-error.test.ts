import { HTTPException } from 'hono/http-exception'
import { describe, expect, it } from 'vitest'
import { AppError, ErrorCode, badRequest, notFoundError, validationFailed } from './app-error'

describe('AppError', () => {
  it('HTTPException を継承している', () => {
    const error = new AppError(400, ErrorCode.BadRequest, 'bad')
    expect(error).toBeInstanceOf(HTTPException)
    expect(error.status).toBe(400)
    expect(error.code).toBe('BAD_REQUEST')
  })

  it('cause を保持する', () => {
    const cause = new Error('root cause')
    expect(new AppError(400, ErrorCode.BadRequest, 'bad', { cause }).cause).toBe(cause)
  })
})

describe('ヘルパー', () => {
  it('badRequest は 400 と BAD_REQUEST を返す', () => {
    const error = badRequest('壊れた JSON です')
    expect(error.status).toBe(400)
    expect(error.code).toBe(ErrorCode.BadRequest)
    expect(error.details).toBeUndefined()
  })

  it('notFoundError は 404 と NOT_FOUND を返す', () => {
    const error = notFoundError('ありません')
    expect(error.status).toBe(404)
    expect(error.code).toBe(ErrorCode.NotFound)
  })

  it('validationFailed は 422 と詳細を返す', () => {
    const details = [{ path: 'title', message: '必須です' }]
    const error = validationFailed(details)
    expect(error.status).toBe(422)
    expect(error.code).toBe(ErrorCode.ValidationFailed)
    expect(error.details).toEqual(details)
  })
})
