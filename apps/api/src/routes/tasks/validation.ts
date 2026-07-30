import type { ApiErrorDetail } from '../../lib/response'
import { TASK_STATUSES, type CreateTaskInput, type TaskStatus, type UpdateTaskInput } from './types'

export type ValidationResult<T> =
  { readonly ok: true; readonly value: T } | { readonly ok: false; readonly issues: readonly ApiErrorDetail[] }

const TITLE_MAX_LENGTH = 200

const isPlainObject = (input: unknown): input is Record<string, unknown> =>
  typeof input === 'object' && input !== null && !Array.isArray(input)

const isTaskStatus = (value: unknown): value is TaskStatus => TASK_STATUSES.includes(value as TaskStatus)

const notAnObject = (): ValidationResult<never> => ({
  ok: false,
  issues: [{ path: '', message: 'リクエストボディはオブジェクトである必要があります' }],
})

/** title を検証し、問題があれば issue を返す。 */
const validateTitle = (title: unknown): ApiErrorDetail | null => {
  if (typeof title !== 'string' || title.trim().length === 0) {
    return { path: 'title', message: 'title は 1 文字以上の文字列である必要があります' }
  }
  if (title.length > TITLE_MAX_LENGTH) {
    return { path: 'title', message: `title は ${TITLE_MAX_LENGTH} 文字以内である必要があります` }
  }
  return null
}

const invalidStatus = (): ApiErrorDetail => ({
  path: 'status',
  message: `status は ${TASK_STATUSES.join(' / ')} のいずれかである必要があります`,
})

/**
 * タスク作成の入力を検証する。
 * status を省略した場合は "todo" を既定値とする。
 */
export const parseCreateTaskInput = (input: unknown): ValidationResult<CreateTaskInput> => {
  if (!isPlainObject(input)) return notAnObject()

  const titleIssue = validateTitle(input.title)
  const status = input.status ?? 'todo'
  const statusIssue = isTaskStatus(status) ? null : invalidStatus()

  const issues = [titleIssue, statusIssue].filter((issue): issue is ApiErrorDetail => issue !== null)
  if (issues.length > 0) return { ok: false, issues }

  return {
    ok: true,
    value: { title: (input.title as string).trim(), status: status as TaskStatus },
  }
}

/**
 * タスク更新の入力を検証する。
 * 指定されたフィールドだけを検証し、未指定のフィールドは変更しない。
 */
export const parseUpdateTaskInput = (input: unknown): ValidationResult<UpdateTaskInput> => {
  if (!isPlainObject(input)) return notAnObject()

  const hasTitle = input.title !== undefined
  const hasStatus = input.status !== undefined

  if (!hasTitle && !hasStatus) {
    return {
      ok: false,
      issues: [{ path: '', message: 'title または status のいずれかを指定してください' }],
    }
  }

  const titleIssue = hasTitle ? validateTitle(input.title) : null
  const statusIssue = hasStatus && !isTaskStatus(input.status) ? invalidStatus() : null

  const issues = [titleIssue, statusIssue].filter((issue): issue is ApiErrorDetail => issue !== null)
  if (issues.length > 0) return { ok: false, issues }

  return {
    ok: true,
    value: {
      ...(hasTitle ? { title: (input.title as string).trim() } : {}),
      ...(hasStatus ? { status: input.status as TaskStatus } : {}),
    },
  }
}
