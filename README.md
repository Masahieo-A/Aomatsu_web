# 青松 English Learning Tools

英語学習支援ツール集のポータルサイト。教員・学習者が使いやすいWebアプリをまとめたハブです。

---

## サイト構成

```
青松web/
├── README.md                    ← このファイル（全体設計書・開発規約）
├── index.html                   ← トップページ（ポータル）
├── assets/
│   ├── css/style.css            ← ポータル共通スタイル
│   └── js/main.js               ← 共通スクリプト（フィルタ・件数カウント）
└── [app-folder]/                ← 各アプリのフォルダ（命名は自由）
    ├── README.md                ← アプリ技術仕様書（開発者向け）
    └── how-to-use-this-app.md  ← 利用開始手順書（運用者向け） ★必須
```

> **各アプリは独立したGitリポジトリ** として管理し、Vercelに個別デプロイする。
> ポータル（`Aomatsu_web`）はカードリンクのみを持ち、アプリ本体を内包しない。

---

## アプリ追加の基本フロー

```
① オーナーがアプリフォルダを 青松web/ に追加
        ↓
② Claude Code にフォルダを渡して実装・調整を依頼
        ↓
③ 以下の「Claude Code への共通指示」に従い実装
        ↓
④ アプリを独立リポジトリとして GitHub にpush → Vercel デプロイ
        ↓
⑤ ポータル（index.html）にカードを追加 → Aomatsu_web にpush → 自動デプロイ
```

---

## Claude Code への共通指示（アプリ追加時に必ず伝えること）

新しいアプリを渡す際は、以下の内容をそのまま Claude Code に伝えてください。

---

### 📋 共通実装ルール

#### 1. デザイン（トンマナ）

ポータルトップページ（`index.html` / `assets/css/style.css`）と統一すること。

| 変数名 | 値 | 用途 |
|---|---|---|
| `--color-accent` | `#2d6a4f` | ボタン・アクセント |
| `--color-accent-light` | `#52b788` | ホバー・フォーカス |
| `--color-accent-dim` | `#d8f3dc` | 背景ハイライト |
| `--color-bg` | `#f8f7f4` | ページ背景 |
| `--color-surface` | `#ffffff` | カード・パネル |
| `--color-border` | `#e2ddd8` | 境界線 |
| `--color-text` | `#1a1714` | 本文テキスト |
| `--color-text-muted` | `#6b645c` | 補足テキスト |

- フォント：`-apple-system, "Noto Sans JP", sans-serif`
- カード形式：`border-radius: 10px`、`border: 1px solid #e2ddd8`
- ボタン：背景 `#2d6a4f`、テキスト `#fff`、hover時 `#1f5238`

#### 2. ポータルへ戻るボタン（全アプリ必須）

すべてのアプリ画面の **ヘッダー左上** に以下のボタンを設置すること。

```html
<!-- 静的HTML の場合 -->
<header class="app-header">
  <a href="https://aomatsu-english-portal.vercel.app" class="site-logo">
    <div class="logo-mark">🌿</div>
    青松 English Tools
  </a>
  <span style="color:#e2ddd8">›</span>
  <span style="font-weight:600">アプリ名</span>
</header>
```

```tsx
// Next.js の場合（layout.tsx）
<header className="sticky top-0 z-50 flex h-[52px] items-center gap-3 border-b border-[#e2ddd8] bg-white px-5">
  <a
    href="https://aomatsu-english-portal.vercel.app"
    className="flex items-center gap-2 font-bold text-[15px] text-[#1a1714] no-underline"
  >
    <span className="flex h-7 w-7 items-center justify-center rounded-[6px] bg-[#2d6a4f] text-sm text-white">
      🌿
    </span>
    青松 English Tools
  </a>
  <span style={{color:"#e2ddd8"}}>›</span>
  <span className="text-sm font-semibold">アプリ名</span>
</header>
```

#### 3. 必須ファイル

各アプリには以下の2ファイルを **必ず** 作成すること。

| ファイル名 | 目的 | 読者 |
|---|---|---|
| `README.md` | 技術仕様（使用技術・構成・既知の制限） | 開発者 |
| `how-to-use-this-app.md` | 利用開始手順（API取得〜設定〜動作確認） | 運用者（オーナー） |

`how-to-use-this-app.md` の詳細フォーマットは下記「how-to-use-this-app.md の書き方」を参照。

---

## how-to-use-this-app.md の書き方

このファイルは **「このアプリを初めて使う人が、ゼロから動かすまでの手順」** を書く運用者向け文書。
技術的な実装詳細は不要。必要な操作と入力場所を具体的に記載する。

### 必須セクション

```markdown
# [アプリ名] — 利用開始手順

## 概要
（1〜2文でアプリの目的を説明）

## 必要なもの
（動かすために必要なアカウント・キー・データを箇条書き）

## セットアップ手順

### 1. [外部サービス名] の設定（必要な場合）
（例：Google API Console でキーを取得する手順）

**取得場所：** （URL）
**入力場所：** （例：Vercel → Settings → Environment Variables）
**変数名：** `VARIABLE_NAME`

### 2. データの準備（スプレッドシート等を使う場合）
（スプレッドシートのURL・シート名・必要な列構成）

**テンプレート：** （スプレッドシートのURL等）
**共有設定：** （例：「リンクを知っている全員が閲覧可」に変更）

### 3. 動作確認
（起動後に確認すべき画面・動作）

## よくあるエラーと対処法
（起動時のエラーと対処を箇条書き）
```

### 外部サービスと入力場所の対応表（テンプレ）

| サービス | 取得場所 | 入力場所 |
|---|---|---|
| Gemini API Key | [Google AI Studio](https://aistudio.google.com/) → Get API key | Vercel → プロジェクト → Settings → Environment Variables |
| OpenAI API Key | [platform.openai.com](https://platform.openai.com/) → API keys | Vercel → Environment Variables |
| Google Sheets ID | スプレッドシートのURLの `/d/` 以降の文字列 | Vercel → Environment Variables または アプリ内設定画面 |
| Google Service Account | Google Cloud Console → IAM → サービスアカウント → キー | Vercel → Environment Variables（JSON全体を貼り付け） |

---

## トップページのカード追加方法

`index.html` のコメント `★ アプリカードはここに追加していく` の直下に追記する。

```html
<article class="app-card" data-category="[カテゴリ]">
  <div class="card-icon">[絵文字]</div>
  <div class="card-body">
    <h3 class="card-title">アプリ名</h3>
    <p class="card-desc">アプリの説明文（1〜2文）</p>
    <div class="card-meta">
      <span class="tag">[カテゴリ表示名]</span>
    </div>
  </div>
  <a href="[デプロイURL]" class="card-link" aria-label="アプリ名を開く"></a>
</article>
```

### カテゴリ一覧

| `data-category` | 表示名 | 用途 |
|---|---|---|
| `vocabulary` | 語彙 | 単語・語彙学習系 |
| `writing` | ライティング | 英作文・添削系 |
| `reading` | リーディング | 読解・テキスト分析系 |
| `listening` | リスニング | 音声・聴解系 |
| `grammar` | 文法 | 文法練習・チェック系 |
| `ocr` | OCR | 画像→テキスト変換系 |
| `utility` | ユーティリティ | PDF変換・管理など汎用ツール |

---

## デプロイ済みURL

| アプリ | Vercel URL | GitHubリポジトリ |
|---|---|---|
| ポータル | https://aomatsu-english-portal.vercel.app | Masahieo-A/Aomatsu_web |
| 英作文 文法添削 | https://eisaku-tensaku-app.vercel.app | Masahieo-A/eisaku-tensaku-app |

---

## 共通デザインルール

- フォント：`-apple-system, BlinkMacSystemFont, "Noto Sans JP", sans-serif`
- カラー：上記カラーパレット参照
- モバイルファースト：ブレークポイント `768px` / `1200px`
- 外部CDN：原則不使用（パフォーマンス・オフライン考慮）

---

## 著作権

© 2025 青松 English Learning Tools
