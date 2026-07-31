---
paths:
  - 'apps/api/src/**/*.{ts,tsx}'
---

# Hono API Implementation Rules

## ディレクトリ構成

機能（feature）単位で縦に切る。レイヤー単位（`controllers/`、`services/` など）で横に切らない。

```text
apps/api/src/
├── index.ts              # Worker のエントリーポイント。export default のみ
├── app.ts                # createApp() でアプリを組み立てる
├── types/env.ts          # Bindings / Variables / AppEnv
├── lib/                  # 横断ヘルパー（logger、response、validator）
├── errors/               # AppError と onError / notFound ハンドラー
├── middleware/           # 共通ミドルウェアと registerMiddleware()
└── routes/
    ├── index.ts              # registerRoutes()。ルート追加時はここに 1 行足す
    ├── [featureName]/        # エンドポイントが 1 つでもディレクトリを作る
    │   └── index.ts          # ルート定義とハンドラー（小さいうちはインライン）
    └── [featureName]/
        ├── index.ts          # ルーター定義と依存の組み立て
        ├── handlers.ts       # 肥大化したときに切り出すハンドラー本体
        ├── validation.ts     # zod スキーマと、そこから導出した入力型
        ├── repository.ts     # データアクセスのインターフェースと実装
        └── types.ts          # ドメイン型
```

判断基準は次のとおり。

- ルートは必ず `routes/<feature>/` ディレクトリとして作る。`routes/<feature>.ts` の単一ファイルは作らない。エンドポイントが 1 つしかない場合も例外を設けない。
- ディレクトリ名はリソースの複数形（`tasks`、`users`）にする。
- 各ディレクトリは `index.ts` を必ず持つ。`index.ts` はルーター定義と依存の組み立てを担い、`routes/index.ts` の `registerRoutes()` に `app.route()` を 1 行足す。
- ハンドラーはまず `index.ts` のルート定義へインラインで書く。行数が増えてきたら `handlers.ts` へ切り出す。
- `handlers.ts` / `validation.ts` / `repository.ts` / `types.ts` は必要になった時点で追加する。中身のないファイルを先回りで作らない。
- 複数の機能から使うものだけを `lib/` へ置く。1 つの機能でしか使わないものは、その機能のディレクトリに置く。
- テストは対象ファイルと同じディレクトリに `<対象>.test.ts` として置く。
- 1 ファイルは 200〜400 行を目安とし、800 行を超えない。

## アプリケーションの組み立て

- `index.ts` は `createApp()` の結果を `export default` するだけに保つ。ルート定義やミドルウェア登録を書かない。
- アプリの生成はファクトリー関数にする。テストごとにまっさらな `app` を作れることが型と状態の両面で効く。
- `AppEnv` を app・ミドルウェア・ハンドラーへ行き渡らせるには `hono/factory` の `createFactory<AppEnv>()` を使い、`factory.createApp()` / `createMiddleware()` / `createHandlers()` から組み立てる。`new Hono<AppEnv>()` を直接使う場合は、ジェネリクスの付け忘れがないか確認する。
- 登録順は「ミドルウェア → ルート → `onError` → `notFound`」で固定する。
- `app.route()` のネストは内側から先に登録する。親を先に `route()` すると子のパスが 404 になり、この間違いは気づきにくい。

```ts
// NG: 親を先にマウントすると /two/three/hi が 404 になる
app.route('/two', two)
two.route('/three', three)

// OK: 内側から積み上げる
two.route('/three', three)
app.route('/two', two)
```

## ルーティング

- ルーターは機能ごとに `new Hono<AppEnv>()` を作り、メソッドチェーンで定義する。チェーンで書くと将来 RPC へ移行するときに型が壊れない。
- 登録順がそのまま優先度になる。`/tasks/archived` のような具体的なパスを `/tasks/:id` より先に登録する。ワイルドカードは最後に置く。
- ミドルウェアは対象ハンドラーより前に登録する。後から `app.use()` しても適用されない。
- パスのプレフィックスはマウント側（`registerRoutes`）に寄せ、ルーター内部は `'/'` や `'/:id'` の相対パスで書く。
- HEAD は Hono が GET へフォールバックさせるため、HEAD 専用ハンドラーは書かない。

```ts
export const createTasksRoute = (repository: TaskRepository): Hono<AppEnv> => {
  const handlers = createTaskHandlers(repository)

  return new Hono<AppEnv>().get('/', handlers.list).post('/', handlers.create).get('/:id', handlers.get)
}
```

## ハンドラーと型推論

ハンドラーはルート定義へインラインで書くのが基本。パスパラメーターの型がそのまま推論される。規模が大きくなっても Ruby on Rails 風のコントローラーへ寄せず、`app.route()` で機能ごとに分割する。

ファイルを分けるとパスパラメーターの型推論が効かなくなるため、分離する場合は次のどちらかで型を取り戻す。

- `hono/factory` の `createFactory<AppEnv>().createHandlers()` を使う（推奨）。ミドルウェアとハンドラーをまとめて定義でき、型推論も保たれる。
- ハンドラーの引数に `Context<AppEnv, '/:id'>` のようなパス付きの型を明示する（既存の `routes/tasks` の方式）。

そのうえで次を守る。

- 依存はファクトリー関数の引数で注入する。ハンドラーがリポジトリを直接 import しない。
- ハンドラーは「入力の取り出し → 検証 → リポジトリ呼び出し → レスポンス生成」だけを行う。ビジネスロジックは別関数へ切り出す。
- 失敗時は `AppError` を throw する。ハンドラー内で `c.json(failure(...))` を組み立てない。
- ボディは `zValidator` を通し、`c.req.valid('json')` で受け取る。バリデーターを通さず `c.req.json()` を直接読む場合は、不正な JSON で例外が飛ぶため `badRequest` へ変換する。
- `createHandlers()` はパスを知らないため、`c.req.param('id')` が `string | undefined` になる。パスパラメーターを使うハンドラーは `createFactory<AppEnv, '/:id'>()` のようにパスを型引数で渡す。

```ts
const idFactory = createFactory<AppEnv, '/:id'>()

export const createTaskHandlers = (repository: TaskRepository) => ({
  get: idFactory.createHandlers(async (c) => {
    const task = await repository.find(c.req.param('id'))
    if (!task) throw notFoundError(TASK_NOT_FOUND)
    return c.json(success(task))
  }),
})
```

`createHandlers()` は配列を返す。ルート定義ではスプレッドして渡す。

```ts
new Hono<AppEnv>().get('/:id', ...handlers.get)
```

## ミドルウェア

- 実行はオニオンモデル。`await next()` の前が往路、後が復路で、復路は登録と逆順に走る。
- 登録順には意味がある。`requestId` → `secureHeaders` → `logger` → `cors` の順を崩さない。後続がログに載せる ID を最初に採番しておく。
- 共通ミドルウェアは `middleware/registerMiddleware()` に集約し、`app.ts` からは 1 回だけ呼ぶ。
- 認証など一部のパスだけに効かせるものは、対象ルーター側で `app.use('/api/*', ...)` のように範囲を絞って適用する。全体に効かせると `/health` まで巻き込む。
- カスタムミドルウェアは `hono/factory` の `createFactory<AppEnv>()` を経由し、`factory.createMiddleware` で書く。`AppEnv` が引き継がれるため、ジェネリクスを毎回書かなくてよい。`c.set()` する値の型は `types/env.ts` の `Variables` に足す。
- factory を経由せず `createMiddleware` を単体で使う場合だけ、`createMiddleware<{ Variables: { userId: string } }>` のようにジェネリクスを明示し、`AppEnv` の `Variables` に合流させる。
- `declare module 'hono'` による `ContextVariableMap` の拡張は使わない。ミドルウェアを適用していないハンドラーでも値が存在するかのように推論され、実行時エラーを型が防げなくなる。
- `next()` は Hono が例外を捕捉して `onError` へ流すため throw しない。ミドルウェアで `try/catch` を書かない。

```ts
const factory = createFactory<AppEnv>()

export const authMiddleware = factory.createMiddleware(async (c, next) => {
  const userId = await verifyToken(c.req.header('authorization'))
  if (!userId) throw new AppError(401, ErrorCode.BadRequest, '認証が必要です')
  c.set('userId', userId)
  await next()
})
```

## 入力検証

- 検証は zod のスキーマで行う。スキーマは `src/routes/<feature>/validation.ts` に置き、入力型は `z.infer` で導出する。型と検証を二重に書かない。
- ルートには `@hono/zod-validator` の `zValidator(target, schema, rejectInvalid)` を挟み、検証済みの値を `c.req.valid('json')` で受け取る。ハンドラーでボディを読み直さない。
- 第 3 引数の `rejectInvalid`（`lib/validator.ts`）は必ず渡す。省略すると zValidator 既定の 400 と zod 独自のボディが返り、`failure()` 形式から外れる。
- 検証ターゲットは `json` / `form` / `query` / `header` / `param` / `cookie` から選ぶ。複数のパートを検証するときはバリデーターをチェーンする。
- 検証は境界（ルート定義）で 1 回だけ行う。通過後は型で保証された値として扱い、下層で再検証しない。
- 最初の 1 件で打ち切らない。zod が集めたすべての issue を `ApiErrorDetail` へ変換し、`path` にはフィールド名（ネストはドット区切り）を入れる。
- 検証に失敗したら 422 を返す。`rejectInvalid` が `validationFailed(details)` を throw し、整形は `onError` に任せる。
- 不正な JSON ボディは zValidator が 400 で弾く。ハンドラーで `try`/`catch` を書かない。
- ヘッダーを検証するときはスキーマのキーを小文字で書く。Hono の検証ターゲットはヘッダーのキーを小文字で持つ。

```ts
export const createTaskSchema = z.object({
  title: z.string().trim().min(1).max(200),
  status: z.enum(TASK_STATUSES).default('todo'),
})

export type CreateTaskInput = z.infer<typeof createTaskSchema>

// ルート側
create: factory.createHandlers(zValidator('json', createTaskSchema, rejectInvalid), async (c) => {
  const task = await repository.create(c.req.valid('json'))
  return c.json(success(task), 201)
})
```

## エラーハンドリング

- 例外は `AppError`（`HTTPException` を継承）を throw し、整形は `errors/error-handler.ts` の `onError` に集約する。
- エラーコードは `ErrorCode` に定義したものだけを使う。ハンドラーごとに文字列リテラルを増やさない。
- 想定内のエラー（`AppError` / `HTTPException`）は `warn`、想定外は `error` でログに出す。
- 想定外のエラーの内容はクライアントへ返さない。500 のメッセージは固定文言にする。
- `notFound` ハンドラーも `failure()` 形式で返し、404 のレスポンス形状を他と揃える。

## レスポンス

- 成功は `success(data, meta?)`、失敗は `failure(code, message, details?)` で組み立てる。素のオブジェクトリテラルを `c.json()` へ直接渡さない。
- ステータスコードは用途で固定する。作成は 201、本文なしの削除は 204（`c.body(null, 204)`）、検証失敗は 422。
- 一覧のページング情報は `meta` に入れる。`data` の中に混ぜない。

## データアクセス

- データアクセスは `TaskRepository` のようなインターフェース越しに行う。D1 や KV の呼び出しをハンドラーへ直接書かない。
- インターフェースは `routes/<feature>/repository.ts` に置き、実装（インメモリ、D1 など）は同じファイルか同じディレクトリに並べる。
- 実装の選択は `routes/<feature>/index.ts` の組み立て箇所だけで行う。差し替え地点を 1 箇所に保つ。
- リポジトリはドメイン型（`Task` など）を返す。DB の行そのものを外へ漏らさない。

## Bindings と環境変数

- 環境変数とバインディングは必ず `c.env` から読む。`process.env` は Workers では使えない。
- モジュールのトップレベルで `env` に触らない。バインディングはリクエストスコープでのみ有効になる。DB クライアントなどの初期化は、ミドルウェアで `c.set()` するか、リクエストごとに生成する。
- グローバル変数にリクエスト固有の状態を持たせない。isolate は複数リクエストで再利用されるため、他のリクエストへ漏れる。
- 型は `Env`（`worker-configuration.d.ts` の生成型）を `Bindings` として使う。`wrangler.jsonc` を変更したら `pnpm cf-typegen` を実行してコミットする。
- `c.set()` する値は `types/env.ts` の `Variables` に型を足す。

## ログ

- 出力は `lib/logger.ts` の `log()` を経由する。`console.log` は禁止で、`console.info` / `warn` / `error` のみ許可している。
- 1 行 1 JSON の構造化ログにする。Cloudflare の observability 側で検索できる形を崩さない。
- ログには `requestId` を必ず含める。リクエストを横断して追跡できなくなる。
- 個人情報やトークン、リクエストボディ全体をログに出さない。

## テスト

- 結合テストは `app.request()` で書く。HTTP サーバーを立てず、Request と Response をそのまま検証する。
- E2E テスト（Playwright）は対象外。`app.request()` の結合テストで代替する。
- テストごとに `createApp()` で新しいアプリを作る。モジュールレベルのシングルトンを共有しない。
- JSON ボディを送るテストでは `Content-Type: application/json` を必ず付ける。付け忘れるとボディが空として扱われ、検証が通らない理由に気づきにくい。
- バインディングは `app.request(path, init, MOCK_ENV)` の第 3 引数でモックする。
- スキーマとリポジトリは `safeParse()` などを使った純粋なユニットテストで網羅し、`app.request()` は経路とステータスの確認に使う。
- カバレッジは 80% 以上を維持する。

```ts
const res = await app.request(
  '/api/tasks',
  {
    method: 'POST',
    body: JSON.stringify({ title: 'テスト' }),
    headers: { 'Content-Type': 'application/json' },
  },
  MOCK_ENV,
)
expect(res.status).toBe(201)
```

## RPC と型共有（導入する場合）

現時点で RPC クライアントは使っていない。導入するときは次を守る。

- ルートはメソッドチェーンで定義する。チェーンを切ると `AppType` に型が乗らない。
- `export type AppType = typeof routes` をアプリのルートで公開する。
- クライアントはコンパイル済みの型を配る。`export type Client = ReturnType<typeof hc<typeof app>>` として `hc` をラップし、利用側での型計算をビルド時へ寄せる。
- ルーターが増えたら機能ごとにクライアントを分ける。1 つの巨大な `AppType` は tsserver を重くする。
- サーバーとクライアントで Hono のバージョンを一致させる。不一致は「Type instantiation is excessively deep」の原因になる。

## パフォーマンス

- ミドルウェアの適用範囲を絞る。`'*'` に付けたものは静的アセットやヘルスチェックにも走る。
- リクエストごとに重い初期化を繰り返さない。定数やスキーマはモジュールスコープで 1 回だけ作る（バインディング依存のものを除く）。
- レスポンスのキャッシュが効く経路では `Cache-Control` を明示する。
- バンドルサイズが問題になったら `hono/tiny` のルーター切り替えを検討する。ただしワイルドカードやパラメーターの多いルーティングでは `hono/quick` などとの比較を先に行う。

## セキュリティ

- `secureHeaders()` を全経路に適用する。
- CORS の許可オリジンは環境変数で管理し、`*` を本番で使わない。
- エラーメッセージにスタックトレースや内部パスを含めない。
- 認証が不要なエンドポイント（`/health` など）を明示し、それ以外は既定で認証を要求する設計にする。

## チェックリスト

実装を終える前に次を確認する。

- [ ] ルートを `routes/<feature>/` ディレクトリとして作り、`index.ts` を置いた。ハンドラーはインラインで書くか、切り出した場合は型推論を保っている。
- [ ] ルーターはメソッドチェーンで定義し、`registerRoutes()` に登録した。
- [ ] 具体的なパスをワイルドカードより先に登録した。
- [ ] ハンドラーは依存を引数で受け取り、リポジトリ越しにデータへアクセスしている。
- [ ] 入力検証を zod スキーマと `zValidator(..., rejectInvalid)` で行い、値を `c.req.valid()` から受け取っている。
- [ ] エラーは `AppError` を throw し、レスポンス整形を `onError` に任せている。
- [ ] レスポンスを `success()` / `failure()` で組み立てている。
- [ ] `c.env` 経由で環境変数を読み、トップレベルで参照していない。
- [ ] `console.log` を使わず `log()` を経由している。
- [ ] `app.request()` の結合テストとユニットテストを書き、カバレッジ 80% を満たしている。
