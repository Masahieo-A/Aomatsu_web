# 未来の図書館（app-mirai-library）

高校英語「未来の図書館」の授業・プレゼンテーション用に、生徒が構想する理想の図書館フロアを AI（`gpt-image-1`）で画像生成する Next.js アプリです。生徒向け（student）。

> **統合リポジトリ内での位置づけ**
> 本アプリは学校ポータル monorepo **aomatsu-web** のサブアプリで、`apps/app-mirai-library/` に配置されています。全画面の左上に English Hub ポータルへ戻る共通ヘッダーを設置し、基本フォントは [`docs/design-system.md`](../../docs/design-system.md)（English Hub デザインシステム）に統一しています。本アプリ固有の「未来の図書館」ブルー基調の世界観は尊重して残しています。

## 概要

- 生徒が日本語または英語で構想を入力 → `gpt-image-1` で図書館フロア画像を生成
- 1ユーザーあたり **2回まで** 生成可能（Supabase で利用回数を管理）
- Google アカウント（学校ドメイン限定）でログイン（NextAuth v5）
- 生成した画像は端末に保存可能

## 技術スタック

| 項目 | 内容 |
|---|---|
| フレームワーク | Next.js 16.2.6（App Router） |
| ランタイム | React 19.2.4 / TypeScript ^5.9 |
| スタイリング | Tailwind CSS ^4 |
| 認証 | NextAuth v5（`next-auth` ^5 beta / Google OAuth） |
| 画像生成 | OpenAI（`openai` ^6、`gpt-image-1`） |
| DB / データ | Supabase（`@supabase/supabase-js` ^2、利用回数・監査ログ） |

## ディレクトリ構成

- `app/` — App Router。`page.tsx`（メイン）・`login/page.tsx`（ログイン）・API ルート（`app/api/generate`：画像生成／`app/api/auth/[...nextauth]`：NextAuth）
- `components/` — `Header` / `MainContent` / `PromptForm` / `GeneratedImage`、`ui/`（button・textarea・badge）
- `lib/` — `supabase.ts` / `openai.ts` / `usage.ts`（利用回数チェック）
- `auth.ts` — NextAuth 設定（Google プロバイダ・許可ドメイン制御）
- `types/` — 型定義
- `docs/` — `要件定義.md`（機能要件の正）・`構成.md`（開発者向け構成メモ）

## 環境変数

`.env.example` を `.env.local` にコピーして設定します（値はコミットしない）。

```bash
cp .env.example .env.local
```

| 変数名 | 用途 |
|---|---|
| `NEXTAUTH_URL` | アプリの URL（本番は Vercel の URL） |
| `NEXTAUTH_SECRET` | NextAuth 署名用シークレット（`openssl rand -base64 32`） |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth クライアント資格情報 |
| `ALLOWED_EMAIL_DOMAIN` | ログインを許可するメールドメイン（例: `school.ed.jp`） |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | Supabase 接続情報（サーバー側のみ） |
| `OPENAI_API_KEY` | OpenAI API キー |
| `SYSTEM_PROMPT_TEMPLATE` | 画像生成プロンプトのテンプレート |
| `MAX_GENERATIONS_PER_USER` | 1ユーザーあたりの生成上限（デフォルト: 2） |

## Supabase スキーマ

`users`（`email` ごとに `generation_count` を保持）と `generations`（監査ログ）の 2 テーブルを使用します。DDL は `docs/構成.md` を参照してください。

## ローカル起動

```bash
npm install
npm run dev
# http://localhost:3000
```

## デプロイ

Vercel（プロジェクト名 `image_2.0`）。本番 URL はオーナーが管理する Vercel チームで確認してください（統合作業アカウントからは参照不可）。デプロイ時は上記環境変数を Vercel 側に設定し、`NEXTAUTH_URL` を本番 URL に、Google Cloud Console のリダイレクト URI に本番コールバック（`/api/auth/callback/google`）を追加します。

---

## コスト目安

`gpt-image-1` / quality `medium` / `1536×1024` = 約 $0.042/枚。300名 × 2回 = 600枚で約 $25。OpenAI Platform の Usage → Limits で月次 Hard Limit の設定を推奨します。

---
機能要件は [docs/要件定義.md](docs/要件定義.md)、開発者向け構成は [docs/構成.md](docs/構成.md) を参照。
