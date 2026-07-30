import type { Context } from 'hono'
import { badRequest, notFoundError, validationFailed } from '../../errors/app-error'
import { success } from '../../lib/response'
import type { AppEnv } from '../../types/env'
import type { TaskRepository } from './repository'
import { parseCreateTaskInput, parseUpdateTaskInput } from './validation'

const TASK_NOT_FOUND = '指定されたタスクが見つかりません'

/** コレクションに対する操作のコンテキスト。 */
type TaskContext = Context<AppEnv>

/** :id 付きパスのコンテキスト。param('id') が string に絞り込まれる。 */
type TaskIdContext = Context<AppEnv, '/:id'>

/** JSON のパース失敗を握りつぶさず 400 に変換する。 */
const readJsonBody = async (c: Context<AppEnv>): Promise<unknown> => {
  try {
    return await c.req.json()
  } catch (error) {
    throw badRequest('リクエストボディの JSON を解析できませんでした', error)
  }
}

/**
 * リポジトリを注入してハンドラーを組み立てる。
 * テストではインメモリ実装やスタブを差し込める。
 */
export const createTaskHandlers = (repository: TaskRepository) => ({
  list: async (c: TaskContext) => c.json(success(await repository.list())),

  get: async (c: TaskIdContext) => {
    const task = await repository.find(c.req.param('id'))
    if (!task) throw notFoundError(TASK_NOT_FOUND)
    return c.json(success(task))
  },

  create: async (c: TaskContext) => {
    const parsed = parseCreateTaskInput(await readJsonBody(c))
    if (!parsed.ok) throw validationFailed(parsed.issues)
    return c.json(success(await repository.create(parsed.value)), 201)
  },

  update: async (c: TaskIdContext) => {
    const parsed = parseUpdateTaskInput(await readJsonBody(c))
    if (!parsed.ok) throw validationFailed(parsed.issues)

    const task = await repository.update(c.req.param('id'), parsed.value)
    if (!task) throw notFoundError(TASK_NOT_FOUND)
    return c.json(success(task))
  },

  remove: async (c: TaskIdContext) => {
    const removed = await repository.remove(c.req.param('id'))
    if (!removed) throw notFoundError(TASK_NOT_FOUND)
    return c.body(null, 204)
  },
})
