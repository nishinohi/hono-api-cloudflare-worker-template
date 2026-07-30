import { describe, expect, it } from 'vitest'
import { createInMemoryTaskRepository } from './repository'
import type { Task } from './types'

const seedTask: Task = {
  id: 'seed-1',
  title: '既存タスク',
  status: 'todo',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

describe('createInMemoryTaskRepository', () => {
  it('初期状態は空である', async () => {
    await expect(createInMemoryTaskRepository().list()).resolves.toEqual([])
  })

  it('seed をそのまま返す', async () => {
    await expect(createInMemoryTaskRepository([seedTask]).list()).resolves.toEqual([seedTask])
  })

  it('create は id と日時を採番する', async () => {
    const repository = createInMemoryTaskRepository()
    const task = await repository.create({ title: '買い物', status: 'todo' })

    expect(task.id).toBeTypeOf('string')
    expect(task.createdAt).toBe(task.updatedAt)
    await expect(repository.list()).resolves.toEqual([task])
  })

  it('seed 配列を変更しない', async () => {
    const seed = [seedTask]
    const repository = createInMemoryTaskRepository(seed)
    await repository.create({ title: '追加', status: 'todo' })

    expect(seed).toEqual([seedTask])
  })

  it('find は存在しない id に null を返す', async () => {
    await expect(createInMemoryTaskRepository([seedTask]).find('missing')).resolves.toBeNull()
  })

  it('find は該当タスクを返す', async () => {
    await expect(createInMemoryTaskRepository([seedTask]).find('seed-1')).resolves.toEqual(seedTask)
  })

  it('update は差分だけを反映し updatedAt を更新する', async () => {
    const repository = createInMemoryTaskRepository([seedTask])
    const updated = await repository.update('seed-1', { status: 'done' })

    expect(updated).toMatchObject({ id: 'seed-1', title: '既存タスク', status: 'done' })
    expect(updated?.createdAt).toBe(seedTask.createdAt)
    expect(updated?.updatedAt).not.toBe(seedTask.updatedAt)
  })

  it('update は元のタスクオブジェクトを変更しない', async () => {
    const repository = createInMemoryTaskRepository([seedTask])
    await repository.update('seed-1', { title: '変更後' })

    expect(seedTask.title).toBe('既存タスク')
  })

  it('update は存在しない id に null を返す', async () => {
    await expect(createInMemoryTaskRepository().update('missing', {})).resolves.toBeNull()
  })

  it('remove は削除できたら true を返す', async () => {
    const repository = createInMemoryTaskRepository([seedTask])

    await expect(repository.remove('seed-1')).resolves.toBe(true)
    await expect(repository.list()).resolves.toEqual([])
  })

  it('remove は存在しない id に false を返す', async () => {
    await expect(createInMemoryTaskRepository([seedTask]).remove('missing')).resolves.toBe(false)
  })
})
