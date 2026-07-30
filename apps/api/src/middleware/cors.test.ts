import { describe, expect, it } from 'vitest'
import { parseAllowedOrigins } from './cors'

describe('parseAllowedOrigins', () => {
  it('undefined はすべて許可する', () => {
    expect(parseAllowedOrigins(undefined)).toBe('*')
  })

  it('空文字と空白のみはすべて許可する', () => {
    expect(parseAllowedOrigins('')).toBe('*')
    expect(parseAllowedOrigins('   ')).toBe('*')
  })

  it('アスタリスクはすべて許可する', () => {
    expect(parseAllowedOrigins('*')).toBe('*')
  })

  it('単一のオリジンを配列にする', () => {
    expect(parseAllowedOrigins('https://example.com')).toEqual(['https://example.com'])
  })

  it('カンマ区切りを分解して空白を取り除く', () => {
    expect(parseAllowedOrigins(' https://a.example.com , https://b.example.com ')).toEqual([
      'https://a.example.com',
      'https://b.example.com',
    ])
  })

  it('空要素を取り除く', () => {
    expect(parseAllowedOrigins('https://a.example.com,,')).toEqual(['https://a.example.com'])
  })

  it('区切り文字だけの場合はすべて許可する', () => {
    expect(parseAllowedOrigins(',,,')).toBe('*')
  })
})
