import { describe, expect, it } from 'vitest'
import { createTaskSchema, updateTaskSchema } from './validation'

/** issue の path をドット区切りにして比較しやすくする。 */
const pathsOf = (result: { error?: { issues: readonly { readonly path: PropertyKey[] }[] } }): string[] =>
  result.error?.issues.map((issue) => issue.path.map(String).join('.')) ?? []

describe('createTaskSchema', () => {
  it('status を省略すると todo になる', () => {
    expect(createTaskSchema.parse({ title: '買い物' })).toEqual({ title: '買い物', status: 'todo' })
  })

  it('title の前後の空白を取り除く', () => {
    expect(createTaskSchema.parse({ title: '  買い物  ', status: 'doing' })).toEqual({
      title: '買い物',
      status: 'doing',
    })
  })

  it.each([null, undefined, 'text', 42, ['a']])('オブジェクト以外を拒否する: %s', (input) => {
    expect(createTaskSchema.safeParse(input).success).toBe(false)
  })

  it('title が空文字なら拒否する', () => {
    const result = createTaskSchema.safeParse({ title: '   ' })
    expect(result.success).toBe(false)
    expect(pathsOf(result)).toEqual(['title'])
  })

  it('title が未指定なら拒否する', () => {
    expect(createTaskSchema.safeParse({}).success).toBe(false)
  })

  it('title が 200 文字を超えたら拒否する', () => {
    const result = createTaskSchema.safeParse({ title: 'あ'.repeat(201) })
    expect(result.success).toBe(false)
    expect(pathsOf(result)).toEqual(['title'])
  })

  it('title が 200 文字ちょうどなら通す', () => {
    expect(createTaskSchema.safeParse({ title: 'あ'.repeat(200) }).success).toBe(true)
  })

  it('未知の status を拒否する', () => {
    const result = createTaskSchema.safeParse({ title: '買い物', status: 'archived' })
    expect(result.success).toBe(false)
    expect(pathsOf(result)).toEqual(['status'])
  })

  it('複数の問題をまとめて返す', () => {
    const result = createTaskSchema.safeParse({ title: '', status: 'archived' })
    expect(pathsOf(result)).toEqual(['title', 'status'])
  })
})

describe('updateTaskSchema', () => {
  it('title だけの更新を受け付ける', () => {
    expect(updateTaskSchema.parse({ title: '掃除' })).toEqual({ title: '掃除' })
  })

  it('status だけの更新を受け付ける', () => {
    expect(updateTaskSchema.parse({ status: 'done' })).toEqual({ status: 'done' })
  })

  it('両方の更新を受け付ける', () => {
    expect(updateTaskSchema.parse({ title: '掃除', status: 'done' })).toEqual({
      title: '掃除',
      status: 'done',
    })
  })

  it('空オブジェクトを拒否する', () => {
    const result = updateTaskSchema.safeParse({})
    expect(result.success).toBe(false)
    expect(pathsOf(result)).toEqual([''])
  })

  it('オブジェクト以外を拒否する', () => {
    expect(updateTaskSchema.safeParse('text').success).toBe(false)
  })

  it('不正な title を拒否する', () => {
    const result = updateTaskSchema.safeParse({ title: 42 })
    expect(pathsOf(result)).toEqual(['title'])
  })

  it('不正な status を拒否する', () => {
    const result = updateTaskSchema.safeParse({ status: 'archived' })
    expect(pathsOf(result)).toEqual(['status'])
  })
})
