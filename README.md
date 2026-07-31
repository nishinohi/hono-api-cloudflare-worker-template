# Cloudflare Workers Hono API テンプレート

Cloudflare Workers 上で動作する Hono 製 API のテンプレートです。pnpm workspace によるマルチパッケージ構成で、API の実装は `apps/api` に置きます。

## 特徴

- 素の Hono による薄い構成。OpenAPI 生成や ORM は含めず、必要になってから足せる。
- リクエスト ID、構造化ログ、CORS、セキュリティヘッダーを最初から配線している。
- エラーレスポンスの形式を `AppError` と `onError` に集約している。
- Repository パターンでデータアクセスを抽象化し、D1 などへの差し替え地点を明示している。
- Vitest によるユニットテストと結合テストを同梱し、カバレッジ 80% をしきい値にしている。
- GitHub Actions による CI と、production / staging / develop の 3 環境デプロイを用意している。

## 技術スタック

| 領域           | 採用技術                   |
| -------------- | -------------------------- |
| ランタイム     | Cloudflare Workers         |
| フレームワーク | Hono 4                     |
| 開発・デプロイ | Wrangler 4                 |
| 言語           | TypeScript                 |
| 入力検証       | zod、@hono/zod-validator   |
| テスト         | Vitest                     |
| Lint / Format  | Oxlint、Prettier、textlint |
| Git フック     | Lefthook                   |
| パッケージ管理 | pnpm workspace             |

## 必要要件

- Node.js 24.11 以上
- pnpm 11 以上（`packageManager` フィールドで固定している）
- Cloudflare アカウント（デプロイする場合のみ）

## クイックスタート

### 1. 依存関係のインストール

```bash
pnpm install
```

### 2. Cloudflare の型生成

`wrangler.jsonc` の設定から `apps/api/worker-configuration.d.ts` を生成します。

```bash
pnpm cf-typegen
```

生成物はリポジトリにコミットします。CI が型チェックをオフラインで実行できるようにするためです。

### 3. ローカルサーバーの起動

```bash
pnpm dev
```

`http://localhost:8787` で待ち受けます。

### 4. 動作確認

```bash
curl http://localhost:8787/health
curl -X POST http://localhost:8787/api/tasks \
  -H 'Content-Type: application/json' \
  -d '{"title":"はじめてのタスク"}'
curl http://localhost:8787/api/tasks
```

## ディレクトリ構成

```
.
├── apps/
│   └── api/                           Cloudflare Workers 上の Hono API
│       ├── wrangler.jsonc             Worker の設定と環境定義
│       ├── worker-configuration.d.ts  wrangler types の生成物
│       └── src/
│           ├── index.ts               Worker のエントリーポイント
│           ├── app.ts                 アプリケーションの組み立て
│           ├── types/env.ts           Bindings と Variables の型
│           ├── lib/                   ログとレスポンスのヘルパー
│           ├── errors/                AppError とエラーハンドラー
│           ├── middleware/            共通ミドルウェア
│           └── routes/                ルーティングとハンドラー
└── packages/
    ├── oxlint-config/                 共有 Oxlint 設定
    └── math/                          ワークスペース参照のサンプル
```

## スクリプト一覧

### ルート

| コマンド             | 説明                                                |
| -------------------- | --------------------------------------------------- |
| `pnpm dev`           | `apps/api` の開発サーバーを起動する                 |
| `pnpm build`         | バンドルの検証（`wrangler deploy --dry-run`）を行う |
| `pnpm deploy`        | production 環境へデプロイする                       |
| `pnpm test`          | 全パッケージのテストを実行する                      |
| `pnpm test:coverage` | カバレッジ付きでテストを実行する                    |
| `pnpm typecheck`     | 全パッケージの型チェックを行う                      |
| `pnpm lint`          | リポジトリ全体を Oxlint で検査する                  |
| `pnpm lint:md`       | Markdown を textlint で検査する                     |
| `pnpm format`        | Prettier で整形する                                 |
| `pnpm check`         | typecheck、lint、test をまとめて実行する            |
| `pnpm cf-typegen`    | Cloudflare の型を再生成する                         |

### apps/api

| コマンド                             | 説明                              |
| ------------------------------------ | --------------------------------- |
| `pnpm --filter api dev`              | Wrangler の開発サーバーを起動する |
| `pnpm --filter api deploy:staging`   | staging 環境へデプロイする        |
| `pnpm --filter api deploy:develop`   | develop 環境へデプロイする        |
| `pnpm --filter api test:watch`       | テストをウォッチモードで実行する  |
| `pnpm --filter api cf-typegen:check` | 生成済みの型が最新か検証する      |

## 設計方針

### レイヤー構成

`src/index.ts` は `createApp()` を呼ぶだけの薄い入口です。`src/app.ts` がミドルウェア、ルーター、エラーハンドラーを登録します。ルートは機能単位でディレクトリを分け、ハンドラー、バリデーション、リポジトリをそれぞれ別ファイルに置きます。

### エラーハンドリング

例外は `src/errors/app-error.ts` の `AppError` を throw します。`HTTPException` を継承しているため、Hono の標準エラーと同じ流れで扱えます。レスポンスの整形は `src/errors/error-handler.ts` に集約しており、想定外の例外は 500 に丸めて内容をクライアントへ返しません。

レスポンス形式は次のとおりです。

```jsonc
// 成功
{ "success": true, "data": { "id": "..." } }

// 失敗
{
  "success": false,
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "入力値が不正です",
    "details": [{ "path": "title", "message": "title は 1 文字以上の文字列である必要があります" }]
  }
}
```

### 入力検証

外部ライブラリを使わず、`src/routes/<feature>/validation.ts` の純粋関数で検証します。戻り値は `ValidationResult<T>` 型で、成功なら `{ ok: true, value }`、失敗なら `{ ok: false, issues }` を返します。zod などへ移行する場合は、このファイルの実装だけを差し替えれば済みます。

### ログ出力

`src/lib/logger.ts` の `log()` を経由して、1 行の JSON として出力します。Cloudflare の observability で検索しやすくするためです。`console.log` は Oxlint で禁止しています。

## 環境変数とシークレット

### wrangler.jsonc の vars

秘匿する必要のない設定値は `wrangler.jsonc` の `vars` に書きます。テンプレートでは `ENVIRONMENT`、`CORS_ALLOWED_ORIGINS`、`LOG_LEVEL` を定義しています。

`vars` や `d1_databases` などのバインディングは環境間で継承されません。`env.staging` や `env.develop` を編集するときは、その環境で必要な設定を必ず全量書いてください。

### ローカルのシークレット

`apps/api/.dev.vars.example` をコピーして `.dev.vars` を作成します。

```bash
cp apps/api/.dev.vars.example apps/api/.dev.vars
```

### 本番のシークレット

```bash
cd apps/api
npx wrangler secret put API_KEY
```

## テスト

### 実行方法

```bash
pnpm test
pnpm --filter api test:watch
```

Vitest を Node 環境で実行し、Hono の `app.request(path, init, env)` を直接呼び出して検証します。第 3 引数で Bindings を注入できるため、Workers を起動せずに結合テストが書けます。

### カバレッジ

```bash
pnpm --filter api test:coverage
```

しきい値は行、分岐、関数、文のいずれも 80% です。CI でも同じコマンドを実行します。

### バインディングを使うテストへの移行

D1 や KV、Durable Objects を導入したら、実際の workerd 上で動かす `@cloudflare/vitest-pool-workers` への移行を検討してください。移行時は次の変更が必要です。

- `pnpm add -D @cloudflare/vitest-pool-workers --filter api`
- `apps/api/vitest.config.ts` を Workers プール用の設定に置き換える
- `apps/api/tsconfig.json` の `types` に `@cloudflare/vitest-pool-workers/types` を追加する
- カバレッジプロバイダーを `istanbul` へ変更する（V8 のネイティブカバレッジには未対応）

## Lint とフォーマット

Oxlint の共有設定は `packages/oxlint-config/base.json` にあります。各パッケージの `.oxlintrc.json` から `extends` で読み込み、そこにパッケージ固有の設定を追加します。整形は Prettier、Markdown の日本語校正は textlint が担当します。

```
packages/oxlint-config/base.json    共通ルール
├── .oxlintrc.json                  リポジトリ直下のファイル向け
├── apps/api/.oxlintrc.json         + wrangler types の生成物を除外
└── packages/math/.oxlintrc.json    追加設定なし
```

oxlint はファイルごとに最も近い `.oxlintrc.json`（nested config）を探して適用します。設定同士はマージされないため、各パッケージの設定は必ず `extends` でベースを読み込んでください。また `-c` / `--config` を渡すとこの探索が無効になるため、`lint` スクリプトでは指定していません。

Lefthook がコミット前に Oxlint、Prettier、textlint、`wrangler types` を自動実行します。初回のみ次のコマンドでフックを登録してください。

```bash
pnpm exec lefthook install
```

## デプロイ

### 環境

| ブランチ  | 環境       | Worker 名                                     |
| --------- | ---------- | --------------------------------------------- |
| `main`    | production | `hono-api-cloudflare-worker-template`         |
| `staging` | staging    | `hono-api-cloudflare-worker-template-staging` |
| `develop` | develop    | `hono-api-cloudflare-worker-template-develop` |

### GitHub Actions の有効化

`.github/workflows/deploy.yml` は既定では発火しません。誤デプロイを防ぐためにダミーのブランチ名を指定しています。有効化するには、`on.push.branches` の `remove-this-line-and-uncomment` を削除し、必要なブランチのコメントを外してください。

### 必要な GitHub Secrets

| 名前                           | 用途                                      |
| ------------------------------ | ----------------------------------------- |
| `CLOUDFLARE_WORKERS_API_TOKEN` | Workers のデプロイ権限を持つ API トークン |
| `CLOUDFLARE_ACCOUNT_ID`        | Cloudflare のアカウント ID                |
| `DISCORD_WEBHOOK_URL`          | デプロイ結果の通知先（任意）              |

## 拡張ガイド

### ルートを追加する

1. `src/routes/<feature>/` を作成し、`types.ts`、`validation.ts`、`repository.ts`、`handlers.ts`、`index.ts` を置く。
2. `src/routes/index.ts` の `registerRoutes()` に 1 行追加する。
3. ハンドラーと同じ階層にテストを置く。

### バリデーションを zod に置き換える

`src/routes/<feature>/validation.ts` の `parseXxxInput` を zod の `safeParse` で実装し直します。戻り値を `ValidationResult<T>` 型に合わせれば、ハンドラー側の変更は不要です。

### D1 と Drizzle を追加する

1. `wrangler.jsonc` の各環境に `d1_databases` を追加し、`pnpm cf-typegen` を実行する。
2. `TaskRepository` を満たす D1 実装を作成する。
3. `src/routes/tasks/index.ts` の `createTasksRoute()` へ渡すリポジトリを差し替える。

### 共有パッケージを追加する

`packages/<name>/` を作成し、`package.json` の `name` を `@repo/<name>` にします。利用側の `devDependencies` に `"@repo/<name>": "workspace:*"` を追加してから `pnpm install` を実行してください。`packages/math` が最小の実例です。

## ライセンス

MIT
