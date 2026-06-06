# 青松 English Hub — Monorepo

英語学習支援Webアプリ集のポータル＆統合リポジトリ。
教員・学習者が使いやすいツールを1つのリポジトリでまとめて管理します。

> **このファイルは Claude Code が最初に読む開発指示書です。**
> 作業を始める前に必ずこの README と [docs/prompt-rules.md](docs/prompt-rules.md) を読んでください。

---

## 0. 最初に読むべきファイル（作業前チェックリスト）

| 順 | ファイル | 何が書いてあるか |
|---|---|---|
| 1 | **README.md**（このファイル） | 全体構成・開発方針・禁止事項 |
| 2 | [docs/prompt-rules.md](docs/prompt-rules.md) | Claude Code の作業ルール（必読） |
| 3 | [PROJECTS.md](PROJECTS.md) | 各アプリの台帳（場所・URL・スタック） |
| 4 | [docs/design-system.md](docs/design-system.md) | デザイン・トンマナ |
| 5 | [docs/coding-rules.md](docs/coding-rules.md) | 実装ルール・命名規則 |
| 6 | [docs/deployment.md](docs/deployment.md) | GitHub / Vercel 対応表 |
| 7 | 対象アプリの `apps/app-xxx/README.md` | そのアプリ固有の仕様 |

---

## 1. このプロジェクトの目的

- 英語授業で使う自作Webアプリ（教材生成・添削・発音練習など）を**1つのリポジトリ**で管理する
- ポータル（トップページ）から各アプリへカードリンクで遷移できるようにする
- どのアプリを・どこにデプロイし・どの設定と対応しているかを一元的に把握できるようにする
- デザイン・命名・開発方針を明文化し、誰が（Claude Code含め）触っても迷わない状態を保つ

---

## 2. 全体構成

```txt
青松web/                              ← リポジトリルート（GitHub: Masahieo-A/Aomatsu_web）
├─ README.md                         ← このファイル（開発指示書）
├─ PROJECTS.md                       ← アプリ台帳
├─ index.html                        ← ポータルトップページ（静的）
├─ vercel.json                       ← ポータル用セキュリティヘッダ
├─ assets/
│  ├─ css/style.css                  ← ポータル共通スタイル
│  └─ js/main.js                     ← ポータル共通スクリプト（フィルタ等）
├─ docs/
│  ├─ coding-rules.md                ← 実装ルール・命名規則
│  ├─ design-system.md               ← デザインシステム
│  ├─ deployment.md                  ← GitHub / Vercel 対応表
│  └─ prompt-rules.md                ← Claude Code 作業ルール
├─ shared/                           ← 複数アプリで共有する部品（現状ほぼ空）
│  ├─ components/
│  ├─ styles/
│  └─ utils/
└─ apps/                             ← 各アプリ（1アプリ1フォルダ）
   ├─ app-eisaku-tensaku/            ← APP001 英作文 文法添削（Next.js + Gemini）
   ├─ app-seijo-maker/               ← APP002 整序メーカー（Next.js）
   ├─ app-cloze-maker/               ← APP003 Cloze Test Maker（Next.js）
   ├─ app-cloze-seijo-maker/         ← APP004 Cloze + 整序（Next.js + Supabase）
   └─ app-elsa-like/                 ← APP005 発音チェック（静的HTML）
```

詳細な各アプリのURL・GitHub・スタックは [PROJECTS.md](PROJECTS.md) を参照。

---

## 3. 重要な開発方針

1. **既存アプリの動作を壊さない** — 各アプリは本番運用中。無関係なアプリには絶対に触らない。
2. **大規模変更は必ず事前提案** — フォルダ移動・リネーム・一括置換・依存更新などは、実行前に影響範囲を説明し承認を得る。
3. **秘密情報をGitに含めない** — `.env` / `.env.local` / APIキー / トークンは絶対にコミットしない（`.gitignore` で除外済み）。
4. **デザイン・命名・デプロイ情報は専用ドキュメントを参照** — このREADMEにURLや設定を増やさず、[PROJECTS.md](PROJECTS.md) / [docs/deployment.md](docs/deployment.md) に集約する。
5. **1アプリ1フォルダ** — `apps/app-xxx/` の中で完結させる。アプリ間の直接依存は作らない（共有は `shared/` 経由）。

---

## 4. アプリの動かし方（ローカル確認）

```bash
# Next.js アプリ（app-eisaku-tensaku / app-seijo-maker / app-cloze-maker / app-cloze-seijo-maker）
cd apps/app-xxx
npm install
npm run dev        # http://localhost:3000 で確認
npm run build      # 本番ビルドが通るか確認（リリース前必須）

# 静的アプリ（app-elsa-like）
cd apps/app-elsa-like
open index.html    # またはローカルサーバ: npx serve .
```

---

## 5. 命名規則（要約）

| 対象 | 規則 | 例 |
|---|---|---|
| アプリフォルダ | `app-用途名`（小文字・ハイフン区切り） | `app-cloze-maker` |
| ドキュメント | 小文字・ハイフン・`.md` | `design-system.md` |
| App ID | `APP` + 3桁連番 | `APP001` |

詳細は [docs/coding-rules.md](docs/coding-rules.md) を参照。

---

## 6. 作業前の注意点（厳守）

- ⛔ **勝手に大規模変更をしない**（フォルダ移動・削除・リネーム・依存一括更新は事前承認制）
- ⛔ **削除は特に慎重に** — 削除前に対象を必ず確認し、理由を説明する
- ⛔ **`.env` などの秘密情報には触れない**
- ⛔ **無関係なアプリのファイルを変更しない**
- ✅ 変更後は対象アプリで `npm run build` が通ることを確認する
- ✅ 変更したファイルは絶対パスまたはルート相対パスで明示する

---

## 7. デプロイ概要

- 各アプリは Vercel に個別プロジェクトとしてデプロイされている（既存URL維持）。
- 詳細な GitHub / Vercel 対応・環境変数・Root Directory 設定は [docs/deployment.md](docs/deployment.md) を参照。

---

© 2025–2026 青松 English Hub
