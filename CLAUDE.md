# 青松 English Hub（学校ポータル monorepo）

- 英語授業用Webアプリ集。ルート＝静的ポータル（index.html）、`apps/` 配下に各アプリ。
- apps: 全16アプリを `apps/app-*` で管理（一覧・App IDは apps/README.md の台帳を参照）。共有物は `shared/`。教員向けアプリは `admin/index.html` にカード掲載。
- 2026-07-20: 旧単独フォルダ12アプリをmonorepoへ完全統合（原本は ~/Archive/_monorepo統合退避_2026-07-20/ に退避、正本はここ）。heigan-naviの元データは `apps/app-heigan-navi/大学search/`。
- ルートに package.json なし。コマンドは各アプリ内で `npm run dev` / `build` / `lint`。
- デプロイ: GitHub `Masahieo-A/Aomatsu_web` → Vercel（ポータルは `aomatsu-english-portal`、アプリ別は docs/deployment.md 参照）。GitHub/Vercel は所有者が手動作成・Import（push は SSH のみ）。
- 作業前に README.md と docs/prompt-rules.md を必読。アプリ追加・変更時は PROJECTS.md（台帳）を必ず更新。
- ファイル役割: README.md=公開用 / docs/要件定義.md=機能要件（バイブコーディング時の正） / docs/構成.md=開発者向け構成メモ。
