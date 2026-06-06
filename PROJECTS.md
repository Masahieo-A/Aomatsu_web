# PROJECTS.md — アプリ台帳

このリポジトリに含まれる全アプリの一覧。新規アプリ追加時は必ずこの表に1行追加すること。

- **App ID** は `APP` + 3桁連番。一度割り当てた番号は使い回さない。
- URL・環境変数の詳細なデプロイ設定は [docs/deployment.md](docs/deployment.md) を参照。

---

## アプリ一覧

| App ID | App Name | Local Path | Status | Main Tech Stack |
|---|---|---|---|---|
| APP001 | 英作文 文法添削 | `apps/app-eisaku-tensaku` | ✅ 本番稼働 | Next.js / React / Gemini API |
| APP002 | 整序メーカー | `apps/app-seijo-maker` | ✅ 本番稼働 | Next.js / React / Tailwind |
| APP003 | Cloze Test Maker | `apps/app-cloze-maker` | ✅ 本番稼働 | Next.js / React / Tailwind |
| APP004 | Cloze + 整序メーカー | `apps/app-cloze-seijo-maker` | 🚧 整備中（ポータル未掲載） | Next.js / React / Supabase(予定) |
| APP005 | 発音チェック（ELSA風） | `apps/app-elsa-like` | ✅ 本番稼働 | 静的HTML / Web Speech API |
| — | ポータル本体 | `/`（リポジトリルート） | ✅ 本番稼働 | 静的HTML / CSS / JS |

---

## 詳細

### APP001 — 英作文 文法添削
- **Description**: 英作文を3段階ヒント型で文法添削するアプリ。辞書機能付き。
- **GitHub Repository**: `Masahieo-A/eisaku-tensaku-app`
- **Vercel Production URL**: https://eisaku-tensaku-app.vercel.app
- **Vercel Preview URL**: Vercel が PR/ブランチごとに自動生成
- **Main Tech Stack**: Next.js (App Router) / React / TypeScript / Tailwind / `@google/genai` (Gemini)
- **Env**: `GEMINI_API_KEY`（Vercel の Environment Variables に設定。Gitには含めない）
- **Notes**: AI APIを使うため、利用にはAPIキー設定が必須。`.env.example` あり。

### APP002 — 整序メーカー
- **Description**: 英文データから整序（並べ替え）問題を自動生成。学年・レッスン・パート選択あり。
- **GitHub Repository**: `Masahieo-A/seijo-maker`
- **Vercel Production URL**: https://seijo-maker.vercel.app
- **Main Tech Stack**: Next.js (App Router) / React / TypeScript / Tailwind
- **Env**: なし
- **Notes**: —

### APP003 — Cloze Test Maker
- **Description**: 英文データから穴埋め（クローズ）問題を自動生成。学年・レッスン・パート選択あり。
- **GitHub Repository**: `Masahieo-A/cloze-maker`
- **Vercel Production URL**: https://cloze-maker.vercel.app
- **Main Tech Stack**: Next.js (App Router) / React / TypeScript / Tailwind
- **Env**: なし
- **Notes**: —

### APP004 — Cloze + 整序メーカー
- **Description**: クローズテストと整序問題を統合生成するアプリ。元はGAS版で、現在Next.jsへ移行済み。
- **GitHub Repository**: `Masahieo-A/cloze-seijo-maker`
- **Vercel Production URL**: https://cloze-seijo-maker.vercel.app （※ポータル未掲載）
- **Main Tech Stack**: Next.js (App Router) / React / TypeScript / Tailwind / Supabase（`supabase-schema.sql` あり、コード配線は整備中）
- **Env**: Supabase接続情報（統合完了時に `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` 等を想定）
- **Notes**: 旧GAS版の `README.md` が残っていたため Next.js 版の内容に更新済み。ポータル（index.html）へのカード掲載は要判断。

### APP005 — 発音チェック（ELSA風）
- **Description**: ブラウザのマイクで発音を録音・評価する発音練習アプリ。単一HTMLファイル構成。
- **GitHub Repository**: `Masahieo-A/ELSA-like`
- **Vercel Production URL**: https://elsa-like.vercel.app
- **Main Tech Stack**: 静的HTML / Vanilla JS / Web Speech API（マイク権限が必要）
- **Env**: なし
- **Notes**: `vercel.json` でマイク用 Permissions-Policy（`microphone=(self)`）を許可。

### ポータル本体
- **Description**: 各アプリへのカードリンクを持つトップページ。カテゴリフィルタ付き。
- **GitHub Repository**: `Masahieo-A/Aomatsu_web`（＝この統合リポジトリ）
- **Vercel Production URL**: https://aomatsu-english-portal.vercel.app
- **Main Tech Stack**: 静的HTML / CSS / JS
- **Notes**: カード追加方法は [docs/coding-rules.md](docs/coding-rules.md) を参照。
