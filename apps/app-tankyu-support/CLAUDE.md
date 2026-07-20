# CLAUDE.md

探究ファシリテーターAI: 高校生の地域探究テーマ・問い立てをGeminiとの対話で支援するWebアプリ。

技術スタック: Next.js 14（App Router）+ TypeScript + Tailwind CSS、AIはGoogle Gemini API（`gemini-2.5-flash`）。

主要コマンド（このフォルダ `apps/app-tankyu-support/` 直下で実行）:
- `npm install`
- `npm run dev`（ローカル起動）
- `npm run build`（本番ビルド確認）
- `npm run lint`

リポジトリ: monorepo `Masahieo-A/Aomatsu_web` の `apps/app-tankyu-support/` で管理（旧単独リポジトリ git@github.com:Masahieo-A/tankyu-support.git は2026-07-20に凍結、原本は ~/Archive に退避）。

ファイル役割: README.md=公開用 / docs/要件定義.md=機能要件（バイブコーディング時の正） / docs/構成.md=開発者向け構成メモ。
