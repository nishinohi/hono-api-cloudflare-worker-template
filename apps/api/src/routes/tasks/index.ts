import { Hono } from 'hono'
import type { AppEnv } from '../../types/env'
import { createTaskHandlers } from './handlers'
import { createInMemoryTaskRepository, type TaskRepository } from './repository'

/**
 * タスクのサンプルルーター。
 *
 * D1 などを導入したら createTasksRoute(createD1TaskRepository(env.DB)) のように
 * リポジトリ実装を差し替える。
 */
export const createTasksRoute = (repository: TaskRepository): Hono<AppEnv> => {
  const handlers = createTaskHandlers(repository)

  return new Hono<AppEnv>()
    .get('/', ...handlers.list)
    .post('/', ...handlers.create)
    .get('/:id', ...handlers.get)
    .patch('/:id', ...handlers.update)
    .delete('/:id', ...handlers.remove)
}

export const tasksRoute = createTasksRoute(createInMemoryTaskRepository())
