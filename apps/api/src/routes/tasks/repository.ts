import type { CreateTaskInput, Task, UpdateTaskInput } from './types'

/**
 * タスクの永続化インターフェース。
 *
 * D1 や KV を導入する際は、この型を満たす別実装を用意して
 * routes/tasks/index.ts の生成箇所を差し替えるだけで済む。
 */
export type TaskRepository = {
  readonly list: () => Promise<readonly Task[]>
  readonly find: (id: string) => Promise<Task | null>
  readonly create: (input: CreateTaskInput) => Promise<Task>
  readonly update: (id: string, input: UpdateTaskInput) => Promise<Task | null>
  readonly remove: (id: string) => Promise<boolean>
}

/**
 * インメモリ実装。
 *
 * Worker の isolate 単位で揮発するためテンプレートのサンプル用途に限る。
 * 配列は参照ごと差し替えるだけで、要素は変更しない。
 */
export const createInMemoryTaskRepository = (seed: readonly Task[] = []): TaskRepository => {
  let tasks: readonly Task[] = seed

  return {
    list: async () => tasks,

    find: async (id) => tasks.find((task) => task.id === id) ?? null,

    create: async (input) => {
      const now = new Date().toISOString()
      const task: Task = {
        id: crypto.randomUUID(),
        title: input.title,
        status: input.status,
        createdAt: now,
        updatedAt: now,
      }
      tasks = [...tasks, task]
      return task
    },

    update: async (id, input) => {
      const current = tasks.find((task) => task.id === id)
      if (!current) return null

      const updated: Task = { ...current, ...input, updatedAt: new Date().toISOString() }
      tasks = tasks.map((task) => (task.id === id ? updated : task))
      return updated
    },

    remove: async (id) => {
      const next = tasks.filter((task) => task.id !== id)
      const removed = next.length !== tasks.length
      tasks = next
      return removed
    },
  }
}
