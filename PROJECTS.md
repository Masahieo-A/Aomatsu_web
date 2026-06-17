# PROJECTS.md — アプリ台帳

このリポジトリに含まれる全アプリの一覧。新規アプリ追加時は必ずこの表に1行追加すること。

- **App ID** は `APP` + 3桁連番。一度割り当てた番号は使い回さない。
- URL・環境変数の詳細なデプロイ設定は [docs/deployment.md](docs/deployment.md) を参照。

---

## アプリ一覧

| App ID | App Name | Local Path | Status | Main Tech Stack |
|---|---|---|---|---|
| APP001 | 英作文 文法添削 | `apps/app-eisaku-tensaku` | ✅ 本番稼働 | Next.js / React / Gemini API |
| APP002 | 整序メーカー（旧） | — | 🗑 廃止（APP004へ統合） | — |
| APP003 | Cloze Test Maker（旧） | — | 🗑 廃止（APP004へ統合） | — |
| APP004 | Cloze + 整序メーカー | `apps/app-cloze-seijo-maker` | ✅ 本番稼働 | Next.js / React / Supabase(予定) |
| APP005 | 発音チェック（ELSA風） | `apps/app-elsa-like` | ✅ 本番稼働 | 静的HTML / Web Speech API |
| — | ポータル本体 | `/`（リポジトリルート） | ✅ 本番稼働 | 静的HTML / CSS / JS |

> **APP002 / APP003 は APP004「Cloze + 整序メーカー」に統合され廃止。** モノレポからフォルダを削除し、ポータルからもカードを除外済み。App ID は使い回さず欠番として保持する。旧GitHubリポジトリ `Masahieo-A/seijo-maker` / `Masahieo-A/cloze-maker` と旧Vercelプロジェクト `seijo-maker` / `cloze-maker` はオーナーが削除（またはアーカイブ）する。

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

### APP002 — 整序メーカー（廃止）
- **Status**: 🗑 廃止。機能は APP004「Cloze + 整序メーカー」に統合済み。
- **跡地**: モノレポの `apps/app-seijo-maker` 削除済み。旧 `Masahieo-A/seijo-maker`（GitHub）と `seijo-maker`（Vercel）はオーナーが削除/アーカイブ。

### APP003 — Cloze Test Maker（廃止）
- **Status**: 🗑 廃止。機能は APP004「Cloze + 整序メーカー」に統合済み。
- **跡地**: モノレポの `apps/app-cloze-maker` 削除済み。旧 `Masahieo-A/cloze-maker`（GitHub）と `cloze-maker`（Vercel）はオーナーが削除/アーカイブ。

### APP004 — Cloze + 整序メーカー
- **Description**: クローズテストと整序問題を統合生成するアプリ。APP002/APP003 を統合した後継。
- **GitHub Repository**: `Masahieo-A/Aomatsu_web`（モノレポ） / Root Directory: `apps/app-cloze-seijo-maker`
- **Vercel Production URL**: https://cloze-seijo-maker.vercel.app （ポータル掲載済み）
- **Main Tech Stack**: Next.js (App Router) / React / TypeScript / Tailwind / Supabase（`supabase-schema.sql` あり、コード配線は整備中）
- **Env**: Supabase接続情報（統合完了時に `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` 等を想定）
- **Notes**: Vercelはモノレポ `Aomatsu_web` に連携済み。`main` への push（Root配下変更時）で自動デプロイ。

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
