import { describe, expect, it } from 'vitest'
import { failure, success } from './response'

describe('success', () => {
  it('meta なしの成功レスポンスを組み立てる', () => {
    expect(success({ id: '1' })).toEqual({ success: true, data: { id: '1' } })
  })

  it('meta ありの成功レスポンスを組み立てる', () => {
    const meta = { total: 10, page: 1, limit: 5 }
    expect(success([], meta)).toEqual({ success: true, data: [], meta })
  })

  it('引数のオブジェクトを変更しない', () => {
    const data = { id: '1' }
    success(data)
    expect(data).toEqual({ id: '1' })
  })
})

describe('failure', () => {
  it('details なしの失敗レスポンスを組み立てる', () => {
    expect(failure('NOT_FOUND', 'not found')).toEqual({
      success: false,
      error: { code: 'NOT_FOUND', message: 'not found' },
    })
  })

  it('details ありの失敗レスポンスを組み立てる', () => {
    const details = [{ path: 'title', message: 'required' }]
    expect(failure('VALIDATION_FAILED', 'invalid', details)).toEqual({
      success: false,
      error: { code: 'VALIDATION_FAILED', message: 'invalid', details },
    })
  })
})
