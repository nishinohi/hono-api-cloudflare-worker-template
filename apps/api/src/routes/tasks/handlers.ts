import { zValidator } from '@hono/zod-validator'
import { createFactory } from 'hono/factory'
import { notFoundError } from '../../errors/app-error'
import { success } from '../../lib/response'
import { rejectInvalid } from '../../lib/validator'
import type { AppEnv } from '../../types/env'
import type { TaskRepository } from './repository'
import { createTaskSchema, updateTaskSchema } from './validation'

const TASK_NOT_FOUND = '指定されたタスクが見つかりません'

/** createHandlers 経由で定義すると、AppEnv と検証済みの入力（c.req.valid）の型が保たれる。 */
const factory = createFactory<AppEnv>()

/** :id 付きパス用。パスを型引数で渡すと c.req.param('id') が string に絞り込まれる。 */
const idFactory = createFactory<AppEnv, '/:id'>()

/**
 * リポジトリを注入してハンドラーを組み立てる。
 * テストではインメモリ実装やスタブを差し込める。
 */
export const createTaskHandlers = (repository: TaskRepository) => ({
  list: factory.createHandlers(async (c) => c.json(success(await repository.list()))),

  get: idFactory.createHandlers(async (c) => {
    const task = await repository.find(c.req.param('id'))
    if (!task) throw notFoundError(TASK_NOT_FOUND)
    return c.json(success(task))
  }),

  create: factory.createHandlers(zValidator('json', createTaskSchema, rejectInvalid), async (c) => {
    const task = await repository.create(c.req.valid('json'))
    return c.json(success(task), 201)
  }),

  update: idFactory.createHandlers(zValidator('json', updateTaskSchema, rejectInvalid), async (c) => {
    const task = await repository.update(c.req.param('id'), c.req.valid('json'))
    if (!task) throw notFoundError(TASK_NOT_FOUND)
    return c.json(success(task))
  }),

  remove: idFactory.createHandlers(async (c) => {
    const removed = await repository.remove(c.req.param('id'))
    if (!removed) throw notFoundError(TASK_NOT_FOUND)
    return c.body(null, 204)
  }),
})
