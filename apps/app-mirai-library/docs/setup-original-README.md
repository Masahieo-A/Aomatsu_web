# 未来の図書館 — Future Library Generator

高校英語「未来の図書館」授業で使用する、AIによる図書館フロア画像生成Webアプリです。

## 概要

- 生徒が日本語または英語で構想を入力 → `gpt-image-1` で画像生成
- 1ユーザーあたり **2回まで** 生成可能（Supabase で管理）
- Googleアカウント（学校ドメイン限定）でログイン

---

## 概算コスト

| 項目 | 値 |
|---|---|
| モデル | `gpt-image-1` |
| クオリティ | `medium` |
| サイズ | `1536×1024` |
| 単価（2025年4月時点） | $0.042 / 枚 |
| **300名 × 2回 = 600枚** | **約 $25.20（約3,700円）** |

> ⚠️ OpenAI Platform の **Usage → Limits** で月次 Hard Limit を設定することを推奨します。

---

## セットアップ手順

### 1. Google Cloud Console の設定

1. [Google Cloud Console](https://console.cloud.google.com/) でプロジェクトを作成
2. **OAuth 同意画面** を設定（User Type: 外部 or 内部）
3. **認証情報 → OAuth 2.0 クライアント ID** を作成
   - アプリの種類: ウェブアプリケーション
   - 承認済みリダイレクト URI:
     - `http://localhost:3000/api/auth/callback/google`（ローカル用）
     - `https://your-app.vercel.app/api/auth/callback/google`（本番用）
4. クライアントID・シークレットを控える

### 2. Supabase の設定

1. [Supabase](https://supabase.com/) でプロジェクトを作成
2. **SQL Editor** で以下を実行:

```sql
-- users テーブル
create table users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  name text,
  generation_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- generations テーブル（監査ログ）
create table generations (
  id uuid primary key default gen_random_uuid(),
  user_email text not null,
  user_prompt text not null,
  image_url text,
  status text not null,
  error_message text,
  created_at timestamptz not null default now()
);

create index on generations (user_email, created_at desc);
```

3. **Project Settings → API** から URL と `service_role` キーを控える

### 3. OpenAI API キーの取得

1. [OpenAI Platform](https://platform.openai.com/) で API キーを発行
2. Usage Limits で Hard Limit を設定（例: $30/月）

### 4. 環境変数の設定

```bash
cp .env.example .env.local
```

`.env.local` に各値を記入:

```bash
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<openssl rand -base64 32 の出力>
GOOGLE_CLIENT_ID=<Google OAuth クライアントID>
GOOGLE_CLIENT_SECRET=<Google OAuth クライアントシークレット>
ALLOWED_EMAIL_DOMAIN=your-school.ed.jp
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
OPENAI_API_KEY=sk-...
MAX_GENERATIONS_PER_USER=2
```

---

## ローカル起動

```bash
npm install
npm run dev
```

ブラウザで http://localhost:3000 を開く。

---

## Vercel デプロイ手順

1. GitHub にプッシュ
2. [Vercel](https://vercel.com/) でリポジトリをインポート
3. **Environment Variables** に `.env.local` の内容を設定
4. `NEXTAUTH_URL` を `https://your-app.vercel.app` に変更
5. Google Cloud Console のリダイレクトURIに Vercel のURLを追加
6. デプロイ

---

## 環境変数一覧

| 変数名 | 説明 |
|---|---|
| `NEXTAUTH_URL` | アプリのURL（本番はVercelのURL） |
| `NEXTAUTH_SECRET` | NextAuth署名用シークレット |
| `GOOGLE_CLIENT_ID` | Google OAuth クライアントID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth クライアントシークレット |
| `ALLOWED_EMAIL_DOMAIN` | 許可するメールドメイン（例: school.ed.jp） |
| `SUPABASE_URL` | SupabaseプロジェクトURL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Service Role Key |
| `OPENAI_API_KEY` | OpenAI APIキー |
| `SYSTEM_PROMPT_TEMPLATE` | 画像生成プロンプトのテンプレート |
| `MAX_GENERATIONS_PER_USER` | 1ユーザーあたりの生成上限（デフォルト: 2） |

---

## ディレクトリ構成

```
.
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts   # NextAuth ルートハンドラ
│   │   └── generate/route.ts             # 画像生成API
│   ├── login/page.tsx                    # ログインページ
│   ├── layout.tsx                        # ルートレイアウト
│   └── page.tsx                          # メイン画面
├── components/
│   ├── Header.tsx
│   ├── MainContent.tsx
│   ├── PromptForm.tsx
│   ├── GeneratedImage.tsx
│   └── ui/                               # UIプリミティブ
├── lib/
│   ├── supabase.ts
│   ├── openai.ts
│   └── usage.ts
├── types/
│   └── index.ts
├── auth.ts                               # NextAuth設定
├── .env.example
└── README.md
```

---
開発者向け情報は [docs/構成.md](docs/構成.md) を参照。
機能要件は [docs/要件定義.md](docs/要件定義.md) を参照。
