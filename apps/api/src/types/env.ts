import type { RequestIdVariables } from 'hono/request-id'

/**
 * Worker のバインディング。
 *
 * `Env` は `wrangler types` が worker-configuration.d.ts に生成するグローバル型で、
 * wrangler.jsonc の vars / secrets / D1 / KV などがそのまま反映される。
 * バインディングを追加したら `pnpm cf-typegen` を実行して型を更新すること。
 */
export type Bindings = Env

/** ミドルウェアが c.set() で積む値。 */
export type Variables = RequestIdVariables

/** Hono のジェネリクスに渡す環境型。 */
export type AppEnv = {
  Bindings: Bindings
  Variables: Variables
}
