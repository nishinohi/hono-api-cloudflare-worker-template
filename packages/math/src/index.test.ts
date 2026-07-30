import { describe, expect, it } from 'vitest'
import { add } from './index'

describe('add', () => {
  it('2つの正の整数を加算できる', () => {
    expect(add(1, 2)).toBe(3)
  })

  it('負の数を含む加算ができる', () => {
    expect(add(-1, 5)).toBe(4)
  })

  it('0との加算ができる', () => {
    expect(add(0, 42)).toBe(42)
  })

  it('小数の加算ができる', () => {
    expect(add(1.5, 2.5)).toBe(4)
  })
})
