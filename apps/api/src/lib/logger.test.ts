import { afterEach, describe, expect, it, vi } from 'vitest'
import { honoLogPrinter, log, serializeError } from './logger'

afterEach(() => {
  vi.restoreAllMocks()
})

const captureLine = (spy: ReturnType<typeof vi.spyOn>): Record<string, unknown> =>
  JSON.parse(String(spy.mock.calls[0]?.[0]))

describe('log', () => {
  it('info は console.info へ JSON 1 行で出力する', () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {})
    log('info', 'hello', { requestId: 'req-1' })

    expect(captureLine(spy)).toMatchObject({
      level: 'info',
      message: 'hello',
      requestId: 'req-1',
    })
  })

  it('warn は console.warn へ出力する', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    log('warn', 'careful')
    expect(captureLine(spy)).toMatchObject({ level: 'warn', message: 'careful' })
  })

  it('error は console.error へ出力する', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    log('error', 'boom')
    expect(captureLine(spy)).toMatchObject({ level: 'error', message: 'boom' })
  })

  it('timestamp を ISO 8601 形式で含める', () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {})
    log('debug', 'trace')
    expect(String(captureLine(spy).timestamp)).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })
})

describe('honoLogPrinter', () => {
  it('可変長引数を連結して info として出力する', () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {})
    honoLogPrinter('-->', 'GET', '/health')

    expect(captureLine(spy)).toMatchObject({
      level: 'info',
      message: '--> GET /health',
      source: 'hono/logger',
    })
  })
})

describe('serializeError', () => {
  it('Error はメッセージとスタックを展開する', () => {
    const result = serializeError(new TypeError('bad type'))
    expect(result).toMatchObject({ errorName: 'TypeError', errorMessage: 'bad type' })
    expect(result.stack).toBeTypeOf('string')
  })

  it('Error 以外は文字列化する', () => {
    expect(serializeError('just a string')).toEqual({
      errorName: 'UnknownError',
      errorMessage: 'just a string',
    })
  })
})
