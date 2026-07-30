import { describe, expect, it } from 'vitest'
import { parseCreateTaskInput, parseUpdateTaskInput } from './validation'

describe('parseCreateTaskInput', () => {
  it('status を省略すると todo になる', () => {
    expect(parseCreateTaskInput({ title: '買い物' })).toEqual({
      ok: true,
      value: { title: '買い物', status: 'todo' },
    })
  })

  it('title の前後の空白を取り除く', () => {
    const result = parseCreateTaskInput({ title: '  買い物  ', status: 'doing' })
    expect(result).toEqual({ ok: true, value: { title: '買い物', status: 'doing' } })
  })

  it.each([null, undefined, 'text', 42, ['a']])('オブジェクト以外を拒否する: %s', (input) => {
    const result = parseCreateTaskInput(input)
    expect(result.ok).toBe(false)
  })

  it('title が空文字なら拒否する', () => {
    const result = parseCreateTaskInput({ title: '   ' })
    expect(result).toMatchObject({ ok: false, issues: [{ path: 'title' }] })
  })

  it('title が未指定なら拒否する', () => {
    expect(parseCreateTaskInput({}).ok).toBe(false)
  })

  it('title が 200 文字を超えたら拒否する', () => {
    const result = parseCreateTaskInput({ title: 'あ'.repeat(201) })
    expect(result).toMatchObject({ ok: false, issues: [{ path: 'title' }] })
  })

  it('title が 200 文字ちょうどなら通す', () => {
    expect(parseCreateTaskInput({ title: 'あ'.repeat(200) }).ok).toBe(true)
  })

  it('未知の status を拒否する', () => {
    const result = parseCreateTaskInput({ title: '買い物', status: 'archived' })
    expect(result).toMatchObject({ ok: false, issues: [{ path: 'status' }] })
  })

  it('複数の問題をまとめて返す', () => {
    const result = parseCreateTaskInput({ title: '', status: 'archived' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.issues).toHaveLength(2)
  })
})

describe('parseUpdateTaskInput', () => {
  it('title だけの更新を受け付ける', () => {
    expect(parseUpdateTaskInput({ title: '掃除' })).toEqual({ ok: true, value: { title: '掃除' } })
  })

  it('status だけの更新を受け付ける', () => {
    expect(parseUpdateTaskInput({ status: 'done' })).toEqual({ ok: true, value: { status: 'done' } })
  })

  it('両方の更新を受け付ける', () => {
    expect(parseUpdateTaskInput({ title: '掃除', status: 'done' })).toEqual({
      ok: true,
      value: { title: '掃除', status: 'done' },
    })
  })

  it('空オブジェクトを拒否する', () => {
    expect(parseUpdateTaskInput({})).toMatchObject({ ok: false, issues: [{ path: '' }] })
  })

  it('オブジェクト以外を拒否する', () => {
    expect(parseUpdateTaskInput('text').ok).toBe(false)
  })

  it('不正な title を拒否する', () => {
    expect(parseUpdateTaskInput({ title: 42 })).toMatchObject({
      ok: false,
      issues: [{ path: 'title' }],
    })
  })

  it('不正な status を拒否する', () => {
    expect(parseUpdateTaskInput({ status: 'archived' })).toMatchObject({
      ok: false,
      issues: [{ path: 'status' }],
    })
  })
})
