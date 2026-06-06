# design-system.md — デザインシステム

ポータルと全アプリで統一するトンマナ。**新規アプリ・改修時は必ずこの方針に従う。**

---

## 基本方針（教育現場向けUI）

- **過度に派手にしない。** アニメーションや装飾は最小限。
- **生徒・教員が迷わないシンプルさ最優先。** 1画面1目的、操作の流れを直線的に。
- **落ち着いた緑基調**（学び・自然のイメージ）。
- **読みやすさ最優先。** 十分なコントラストと文字サイズ。
- **モバイル対応必須。** 生徒のスマホでも崩れないこと。

---

## カラーパレット

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

- ボタン hover 時のアクセント濃色: `#1f5238`

---

## タイポグラフィ

- フォント: `-apple-system, BlinkMacSystemFont, "Noto Sans JP", sans-serif`
- 本文サイズ: 15〜16px を基準
- 見出しは太字（`font-weight: 600〜800`）でメリハリをつける
- 行間はゆったり（`line-height: 1.6` 目安）

---

## 余白（スペーシング）

- 基準単位: 4px の倍数（4 / 8 / 12 / 16 / 24 / 32）
- カード内パディング: 16〜24px
- セクション間: 24〜32px
- 詰め込みすぎない。余白で情報をグルーピングする。

---

## コンポーネント

### カード
- `border-radius: 10px`
- `border: 1px solid #e2ddd8`
- 背景: `#ffffff`
- hover時にわずかに浮く程度（影は控えめ）

### ボタン
- 背景: `#2d6a4f` / 文字: `#fff`
- hover: `#1f5238`
- `border-radius: 8px` 目安、十分なタップ領域（高さ40px以上）

### フォーム
- ラベルを必ず付ける（プレースホルダだけに頼らない）
- 入力欄: `border: 1px solid #e2ddd8`、フォーカス時に `--color-accent-light`
- エラーは赤系＋テキストで明示。色だけに依存しない。

### ヘッダー（全アプリ必須：ポータルへ戻る導線）

すべてのアプリ画面の**左上**にポータルへ戻るリンクを置く。

静的HTML:
```html
<header class="app-header">
  <a href="https://aomatsu-english-portal.vercel.app" class="site-logo">
    <div class="logo-mark">🌿</div>
    青松 English Tools
  </a>
  <span style="color:#e2ddd8">›</span>
  <span style="font-weight:600">アプリ名</span>
</header>
```

Next.js (`layout.tsx`):
```tsx
<header className="sticky top-0 z-50 flex h-[52px] items-center gap-3 border-b border-[#e2ddd8] bg-white px-5">
  <a href="https://aomatsu-english-portal.vercel.app"
     className="flex items-center gap-2 font-bold text-[15px] text-[#1a1714] no-underline">
    <span className="flex h-7 w-7 items-center justify-center rounded-[6px] bg-[#2d6a4f] text-sm text-white">🌿</span>
    青松 English Tools
  </a>
  <span style={{color:"#e2ddd8"}}>›</span>
  <span className="text-sm font-semibold">アプリ名</span>
</header>
```

---

## レスポンシブ対応

- モバイルファースト
- ブレークポイント: `768px`（タブレット）/ `1200px`（デスクトップ）
- タップ対象は最小44px四方を確保
- 外部CDNは原則不使用（パフォーマンス・オフライン考慮、フォントを除く）

---

## ポータルのカテゴリ（カードの `data-category`）

| `data-category` | 表示名 | 用途 |
|---|---|---|
| `vocabulary` | 語彙 | 単語・語彙学習系 |
| `writing` | ライティング | 英作文・添削系 |
| `reading` | リーディング | 読解・テキスト分析系 |
| `listening` | リスニング | 音声・聴解系 |
| `grammar` | 文法 | 文法練習・チェック系 |
| `ocr` | OCR | 画像→テキスト変換系 |
| `utility` | ユーティリティ | PDF変換・管理など汎用 |
