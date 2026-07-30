import { createApp } from './app'

const app = createApp()

export default app

// scheduled / queue / email などのハンドラーを追加する場合は、
// 上の export を削除して以下の形に切り替える:
//
// export default {
//   fetch: app.fetch,
//   scheduled: async (_event, _env, _ctx) => {
//     // 定期実行の処理
//   },
// } satisfies ExportedHandler<Env>
