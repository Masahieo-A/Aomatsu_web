@AGENTS.md

# sodateru-ai（授業用AIアプリ）

- Next.js 16（App Router・TypeScript）+ Cloudflare Workers（vinext）+ D1 + Google OIDC + Gemini API + Tailwind。
- 正本は monorepo `Masahieo-A/Aomatsu_web` の `apps/app-sodateru-ai`（旧単独リポジトリ `Masahieo-A/sodateru-ai` はアーカイブ予定・更新しない）。
- コマンド: `npm run dev:vinext` / `build:vinext` / `deploy:vinext` / `lint` / `typecheck`。
- デプロイ: このフォルダで `npm run build:vinext && npm run deploy:vinext` → Cloudflare Workers `sodateru-ai`（https://sodateru-ai.aomatsu-apps.workers.dev/）。
- DBスキーマは `migrations/`（D1）。現行構成は `docs/構成.md`、旧設計の背景資料は DESIGN.md。
- 共通ヘッダー・配色は monorepo の `docs/design-system.md` 準拠（`app/layout.tsx`・`app/globals.css`）。
- Next.js は学習データと差分あり — AGENTS.md の指示どおり `node_modules/next/dist/docs/` を先に参照。
- ファイル役割: README.md=公開用 / docs/要件定義.md=機能要件（バイブコーディング時の正） / docs/構成.md=開発者向け構成メモ。
