# 育てるAI（app-sodateru-ai）

学習者がAI（ソウタ）へ英文法を教え、AIの推論を確認・修正し、最後に独立問題で自分の理解も確かめる授業アプリです。生徒向け（student）。

> **統合リポジトリ内での位置づけ**
> 本アプリは学校ポータル monorepo **aomatsu-web** のサブアプリで、`apps/app-sodateru-ai/` に配置されています（正本）。トンマナは [`docs/design-system.md`](../../docs/design-system.md)（English Hub デザインシステム）に準拠し、全画面の上部にポータルへ戻る共通ヘッダーを設置しています。
> 旧単独リポジトリ `Masahieo-A/sodateru-ai`（ブランチ `codex/cloudflare-curriculum-migration` 先頭 `db4d549`）から 2026-09-26 に移転しました。

- 本番URL: https://sodateru-ai.aomatsu-apps.workers.dev/

## 現行構成

| 項目 | 内容 |
|---|---|
| フレームワーク | Next.js 16（App Router）/ React 19 / TypeScript |
| スタイリング | Tailwind CSS 4 |
| 実行環境 | Cloudflare Workers（vinext） |
| DB | Cloudflare D1（バインディング名 `DB`、スキーマは `migrations/`） |
| 認証 | Google OpenID Connect（`tomidah.com` の確認済みアカウントのみ） |
| LLM | Gemini API（`@google/generative-ai`） |

教員権限は、`TEACHER_ALLOWLIST` またはD1の `teacher_allowlist` に登録したアカウントだけに付与します。

## ディレクトリ構成

- `app/` — App Router のページと API ルート
- `components/` — UI コンポーネント
- `lib/` — 認証・D1・Gemini 連携・教材バリデータ等
- `curriculum/` — 教材JSON（スキーマ・サンプル・生成物）
- `migrations/` — D1 マイグレーション
- `scripts/` — 教材ランタイムJSONの生成スクリプト
- `docs/` — `要件定義.md`（機能要件の正）・`構成.md`（開発者向け構成メモ）

## 環境変数・シークレット

名前の一覧は `.env.example` にあります。値はコミットしません。

- ローカル: Git管理外の `.dev.vars` に書く
- 本番: `npx wrangler secret put <名前>`（または Cloudflare ダッシュボード）で設定する

## ローカル起動

```bash
npm ci
npx wrangler d1 migrations apply DB --local --config wrangler.jsonc
npm run dev:vinext
```

検証コマンド:

```bash
npm run lint
npm run typecheck
npm run build:vinext
npm audit --omit=dev
```

## デプロイ（Cloudflare Workers）

このフォルダ（`apps/app-sodateru-ai`）で実行します。

```bash
npm run build:vinext
npm run deploy:vinext
```

D1 のスキーマを変更したときは、デプロイ前に `npx wrangler d1 migrations apply DB --remote --config wrangler.jsonc` を実行します。

教材JSONの契約は `curriculum/schema/curriculum.schema.json`、例は `curriculum/examples/current-units.json` にあります。教材からJSONを生成するAI向け指示文は、運用時にチャットで渡し、リポジトリには保存しません。

詳細は [docs/構成.md](docs/構成.md) を参照してください。
