import { z } from 'zod'
import { TASK_STATUSES } from './types'

const TITLE_MAX_LENGTH = 200

const TITLE_REQUIRED = 'title は 1 文字以上の文字列である必要があります'
const STATUS_INVALID = `status は ${TASK_STATUSES.join(' / ')} のいずれかである必要があります`

/** title は前後の空白を取り除いてから長さを見る。 */
const titleSchema = z
  .string({ error: TITLE_REQUIRED })
  .trim()
  .min(1, TITLE_REQUIRED)
  .max(TITLE_MAX_LENGTH, `title は ${TITLE_MAX_LENGTH} 文字以内である必要があります`)

const statusSchema = z.enum(TASK_STATUSES, { error: STATUS_INVALID })

/** タスク作成の入力。status を省略した場合は "todo" を既定値とする。 */
export const createTaskSchema = z.object({
  title: titleSchema,
  status: statusSchema.default('todo'),
})

/** タスク更新の入力。指定されたフィールドだけを検証し、未指定のフィールドは変更しない。 */
export const updateTaskSchema = z
  .object({
    title: titleSchema.optional(),
    status: statusSchema.optional(),
  })
  .refine((input) => input.title !== undefined || input.status !== undefined, {
    error: 'title または status のいずれかを指定してください',
  })

export type CreateTaskInput = z.infer<typeof createTaskSchema>
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>
