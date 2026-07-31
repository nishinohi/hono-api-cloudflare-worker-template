# CLAUDE.md

## プロジェクト概要

Cloudflare Workers 上で動作する Hono 製 API のテンプレートです。pnpm workspace のマルチパッケージ構成で、API の実装は `apps/api` に置きます。

## 技術スタック

Hono 4 / Cloudflare Workers / Wrangler 4 / TypeScript / Vitest / Oxlint / Prettier / textlint / Lefthook / pnpm workspace

## ディレクトリ構成

| パス                        | 役割                                           |
| --------------------------- | ---------------------------------------------- |
| `apps/api/src/index.ts`     | Worker のエントリーポイント                    |
| `apps/api/src/app.ts`       | `createApp()` によるアプリケーションの組み立て |
| `apps/api/src/types/env.ts` | Bindings と Variables の型                     |
| `apps/api/src/lib/`         | ログとレスポンスのヘルパー                     |
| `apps/api/src/errors/`      | `AppError` とエラーハンドラー                  |
| `apps/api/src/middleware/`  | 共通ミドルウェア                               |
| `apps/api/src/routes/`      | ルーティングとハンドラー                       |
| `packages/oxlint-config/`   | 共有 Oxlint 設定（`base.json`）                |
| `packages/math/`            | ワークスペース参照のサンプル                   |

## よく使うコマンド

| コマンド                          | 説明                                     |
| --------------------------------- | ---------------------------------------- |
| `pnpm dev`                        | 開発サーバーを起動する                   |
| `pnpm check`                      | typecheck、lint、test をまとめて実行する |
| `pnpm test`                       | テストを実行する                         |
| `pnpm --filter api test:coverage` | カバレッジ付きでテストを実行する         |
| `pnpm cf-typegen`                 | `wrangler.jsonc` から型を再生成する      |
| `pnpm build`                      | バンドルを検証する                       |

## 本プロジェクト固有の約束

以下は `.claude/rules/` の記述より優先します。

- Lint ルールの共通変更は `packages/oxlint-config/base.json` に入れる。パッケージ固有の設定はそのパッケージの `.oxlintrc.json` に書き、必ず `extends` でベースを読み込む。oxlint は設定をマージせず最も近いものだけを適用するため、`extends` を省くとベースが失われる。
- oxlint の実行に `-c` / `--config` は付けない。nested config の探索が無効になり、パッケージごとの `.oxlintrc.json` が読まれなくなる。
- `wrangler.jsonc` を変更したら `pnpm cf-typegen` を実行し、`worker-configuration.d.ts` をコミットする。
- `compatibility_date` はインストール済みの workerd が対応する日付までしか指定できない。進める場合は `wrangler dev` で起動を確認する。
- `wrangler.jsonc` の `vars` などのバインディングは環境間で継承されない。`env.*` を編集するときは全量を書く。

## ルール

@.claude/rules/coding-style.md
@.claude/rules/testing.md
@.claude/rules/patterns.md
@.claude/rules/security.md
@.claude/rules/performance.md
@.claude/rules/git-workflow.md
@.claude/rules/agents.md
@.claude/rules/hooks.md
