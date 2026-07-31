export const TASK_STATUSES = ['todo', 'doing', 'done'] as const

export type TaskStatus = (typeof TASK_STATUSES)[number]

export type Task = {
  readonly id: string
  readonly title: string
  readonly status: TaskStatus
  readonly createdAt: string
  readonly updatedAt: string
}
