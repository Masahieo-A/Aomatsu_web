# 育てるAI（app-sodateru-ai）

対話型の英文法学習アプリ。生徒が「AIに英文法を教える」ことで、自分自身の理解と説明力を高めることを狙いとした Next.js アプリです。生徒向け（student）。

> **統合リポジトリ内での位置づけ**
> 本アプリは学校ポータル monorepo **aomatsu-web** のサブアプリで、`apps/app-sodateru-ai/` に配置されています。トンマナは [`docs/design-system.md`](../../docs/design-system.md)（English Hub デザインシステム）に準拠し、全画面の左上にポータルへ戻る共通ヘッダーを設置しています。

## 技術スタック

| 項目 | 内容 |
|---|---|
| フレームワーク | Next.js 16.2.6（App Router） |
| ランタイム | React 19.2.4 / TypeScript ^5 |
| スタイリング | Tailwind CSS ^4 |
| LLM | Google Gemini（`@google/generative-ai` ^0.24.1） |
| DB / データ | Supabase（`@supabase/supabase-js` ^2.106.2） |

## ディレクトリ構成

- `app/` — App Router。ページ（`page.tsx` / `join` / `session/[code]` / `teacher`）と API ルート（`app/api/`：`lesson/{hint,practice,summary,test}`・`sessions/[code]/{start,join,end}`・`teacher`）
- `components/` — UI コンポーネント
- `lib/` — Supabase クライアント・Gemini 連携などのユーティリティ
- `supabase/` — DB スキーマ定義（`supabase/schema.sql`）
- `types/` — 型定義
- `docs/` — `要件定義.md`（機能要件の正）・`構成.md`（開発者向け構成メモ）

## 環境変数

`.env.example` を `.env.local` にコピーして設定します。

```bash
cp .env.example .env.local
```

| 変数名 | 用途 |
|---|---|
| `GEMINI_API_KEY` | Gemini API キー |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase プロジェクト URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon キー |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role キー（サーバー側のみ） |
| `TEACHER_PASSWORD` | 教員画面のパスワード |

本番は Vercel の環境変数に設定します。

## ローカル開発

```bash
npm install      # 初回のみ
npm run dev      # 開発サーバー（http://localhost:3000）
npm run build    # 本番ビルド確認
npm start        # 本番起動
```

## デプロイ

Vercel（プロジェクト名: `sodateru-ai`）。詳細は [`docs/構成.md`](docs/構成.md) を参照。

---

- 機能要件: [`docs/要件定義.md`](docs/要件定義.md)
- 開発者向け構成メモ: [`docs/構成.md`](docs/構成.md)
- デザインシステム: [`docs/design-system.md`](../../docs/design-system.md)
