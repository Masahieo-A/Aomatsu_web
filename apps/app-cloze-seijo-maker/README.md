# Cloze Test & 整序メーカー（APP004）— 技術仕様

クローズテスト（穴埋め）と整序（並べ替え）問題を生成するWebアプリ。
**旧 Google Apps Script (GAS) 版から Next.js へ移行済み。** 本文書はNext.js版の仕様。
（旧GAS版の仕様は `~/Desktop/青松web_backup_2026-06-06/` 内に退避済み）

---

## 概要

レッスン・パートごとに登録した英文データから、クローズテスト問題と整序問題を生成する。
データストアとして Supabase（PostgreSQL）を利用する想定で、テーブル定義を `supabase-schema.sql` に同梱。

---

## ファイル構成

```
app-cloze-seijo-maker/
├── app/
│   ├── layout.tsx          ← 共通レイアウト（ヘッダー等）
│   ├── page.tsx            ← トップ（モード選択）
│   ├── cloze/page.tsx      ← クローズテスト生成画面
│   ├── seijo/page.tsx      ← 整序問題生成画面
│   └── globals.css
├── components/             ← UIコンポーネント
├── lib/                    ← ユーティリティ・データアクセス
├── public/                 ← 静的アセット
├── supabase-schema.sql     ← Supabase テーブル定義（cloze_tests / sentence_rearrangements）
├── package.json
└── README.md               ← このファイル
```

---

## 使用技術

| 技術 | 用途 |
|---|---|
| Next.js (App Router) / React / TypeScript | フロントエンド・ルーティング |
| Tailwind CSS | スタイリング |
| lucide-react | アイコン |
| Supabase (PostgreSQL) | 問題データのデータソース（コード配線は整備中） |

---

## データモデル（`supabase-schema.sql`）

- `cloze_tests`: クローズテスト問題（`lesson`, `part`, `title`, `display_order`, `body`, `trans` …）
- `sentence_rearrangements`: 整序問題（`lesson`, `part`, `title`, `seq`, `sentence`, `trans` …）

セットアップは Supabase の SQL エディタで `supabase-schema.sql` を実行する。

### 現状のデータソース（静的JSON）

Supabase 配線が整うまでは `public/data/cloze.json` / `public/data/seijo.json` の
静的ファイルを `fetch` して描画する。両ファイルは Google スプレッドシート
（`CT_整序maker_Lesson1_3`）から書き出したデータをビルドスクリプトで生成する：

```bash
node scripts/build-data.mjs   # scripts/source-data.md → public/data/*.json
```

- 並び順は「No.」列ではなくシート上の行順（=本文の流れ）で `display_order` / `seq` を採番する。
- **cloze の `body` は元の英文をそのまま保持する（空欄は埋め込まない）。**

### クローズの空欄生成（非破壊・描画時生成）

`body` を `/\s+/` で分割し、`wordCount % interval === 0` かつ記号
（`. , ? ! "`）を除いた中身が1文字以上あるトークンを空欄にする。元データは
書き換えないため、難易度（`interval`: やさしい7 / ふつう5 / むずかしい3）と
解答モード（タップ表示 / 入力採点）をリアルタイムに切り替えられる。
正誤判定は両者の記号除去＋小文字化後の厳密一致で行う。

### 整序のトークン化

`sentence`（=元の英文）を実行時に `split(" ")` で単語チップ化し、シャッフルして
バンクに並べる。句読点は語に付いたまま扱う（`Dr.` / `"zoo` / `dentists."` など）ため、
`Dr.` のような略語や引用符を含む文も崩れずに復元・採点できる。

---

## 環境変数

Supabase 連携を有効化する際に設定（**コミット禁止**・Vercel の Environment Variables に登録）:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

詳細は [../../docs/deployment.md](../../docs/deployment.md) を参照。

---

## ローカル開発

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # 本番ビルド確認
```

---

## ステータス

クローズ・整序ともに L1 / L3（各 Part 1・Part 2、計43文）のデータを投入済みで稼働可能。
Supabase 配線は引き続き整備中。ポータル（`index.html`）へのカード掲載は未実施（掲載要否はオーナー判断）。
台帳は [../../PROJECTS.md](../../PROJECTS.md)（APP004）を参照。
