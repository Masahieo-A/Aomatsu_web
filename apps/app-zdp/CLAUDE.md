# ZDP（英語つまずき診断 monorepo）

- ZPD理論に基づく英語学習支援。`apps/zdp`（生徒向け診断）と `apps/master-editor`（`grammar_master.json` の作成・検証）の2アプリ構成。
- Next.js 14 + TypeScript、npm workspaces。共有: `packages/prompts`（プロンプト）・`packages/schema`（スキーマ検証）。
- コマンド: `npm run dev:zdp` / `dev:master` / `build:zdp` / `build:master` / `sync-prompts`。
- 2アプリは `grammar_master.json` で連携。ZDPアプリのDBはGoogleスプレッドシート。APIキーなしのモックモードあり。
- デプロイ: 未設定（README は Vercel を想定。GitHub/Vercel は所有者が手動作成・Import、push は SSH のみ）。
- 注意: プロンプトは `packages/prompts/templates/` が単一の正。直接コピーせず `sync-prompts` 経由で同期。

ファイル役割: README.md=公開用 / docs/要件定義.md=機能要件（バイブコーディング時の正） / docs/構成.md=開発者向け構成メモ。
旧 `ZDP_要件定義.md` / `ZDP_プロンプト設計.md` / `文法項目マスタ_要件定義.md` はそれぞれ `docs/要件定義.md` / `docs/プロンプト設計.md` / `docs/文法項目マスタ_要件定義.md` に移動済み。
