@AGENTS.md

# 未来の図書館 — Future Library Generator

- 高校英語「未来の図書館」授業用。生徒の構想文から `gpt-image-1` で図書館フロア画像を生成。
- Next.js 16（App Router・TypeScript）+ Supabase + OpenAI + NextAuth（Googleログイン・学校ドメイン限定）。
- コマンド: `npm run dev` / `build` / `start` / `lint`。
- デプロイ: Vercel プロジェクト `image_2.0`。git remote は未設定（GitHub/Vercel は所有者が手動作成・Import、push は SSH のみ）。
- 注意: 生成は1ユーザー2回まで（Supabaseで管理、コスト対策）。この制限ロジックは勝手に変えない。
- Next.js は学習データと差分あり — AGENTS.md の指示どおり `node_modules/next/dist/docs/` を先に参照。
- ファイル役割: README.md=公開用 / docs/要件定義.md=機能要件（バイブコーディング時の正） / docs/構成.md=開発者向け構成メモ。
