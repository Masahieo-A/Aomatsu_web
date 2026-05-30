# 青松 English Learning Tools

英語学習支援ツール集のポータルサイト。教員・学習者が使いやすいWebアプリをまとめたハブです。

---

## サイト構成

```
青松web/
├── README.md          ← このファイル（全体設計書）
├── index.html         ← トップページ（ポータル）
├── assets/
│   ├── css/style.css  ← 共通スタイル
│   └── js/main.js     ← 共通スクリプト（フィルタ・アニメーション）
└── apps/
    ├── README.md      ← アプリ追加手順
    └── [app-name]/    ← 各アプリのフォルダ（後述の規約に従って追加）
        ├── index.html
        └── README.md
```

---

## トップページのカード追加方法

`index.html` の `<section id="app-grid">` 内に以下のカードHTMLを追加する。

```html
<article class="app-card" data-category="[カテゴリ]" data-tags="[タグ1],[タグ2]">
  <div class="card-icon">
    <!-- SVGアイコンまたは絵文字 -->
    🔤
  </div>
  <div class="card-body">
    <h3 class="card-title">アプリ名</h3>
    <p class="card-desc">アプリの説明文（1〜2文）</p>
    <div class="card-meta">
      <span class="tag">[カテゴリ]</span>
    </div>
  </div>
  <a href="apps/[app-name]/index.html" class="card-link" aria-label="アプリ名を開く"></a>
</article>
```

### カテゴリ一覧（`data-category` の値）

| 値 | 表示名 | 用途 |
|---|---|---|
| `vocabulary` | 語彙 | 単語・語彙学習系 |
| `writing` | ライティング | 英作文・添削系 |
| `reading` | リーディング | 読解・テキスト分析系 |
| `listening` | リスニング | 音声・聴解系 |
| `grammar` | 文法 | 文法練習・チェック系 |
| `ocr` | OCR | 画像→テキスト変換系 |
| `utility` | ユーティリティ | PDF変換・管理など汎用ツール |

---

## 新しいアプリを追加する手順

1. `apps/` 以下に `apps/[app-name]/` フォルダを作成する
2. フォルダ内に `index.html`（アプリ本体）と `README.md`（アプリ説明）を置く
3. `index.html` のカードセクションにカードHTMLを追加する（上記テンプレート参照）
4. アプリの `README.md` には以下を記載する：
   - アプリ概要
   - 使用技術（API・ライブラリなど）
   - 動作要件（ネット接続の要否など）
   - 既知の制限事項

---

## 共通デザインルール

- フォント：システムフォント（`-apple-system`, `Segoe UI`, `Noto Sans JP`）
- カラー：CSS変数（`--color-*`）を使用。`assets/css/style.css` の `:root` を参照
- アプリ内ページは `assets/css/style.css` をインポートして統一感を維持する
- モバイルファースト：ブレークポイントは `768px`（タブレット）・`1200px`（デスクトップ）

---

## 使用技術スタック

- **フロントエンド**：HTML / CSS / Vanilla JS（フレームワークなし）
- **AIモデル**：各アプリのREADMEを参照
- **外部依存**：なし（CDN不使用を原則とする）

---

## 連絡先・著作権

© 2025 青松 English Learning Tools  
作成者：青松研究室
