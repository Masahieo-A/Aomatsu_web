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

🚧 整備中。ポータル（`index.html`）へのカード掲載は未実施（掲載要否はオーナー判断）。
台帳は [../../PROJECTS.md](../../PROJECTS.md)（APP004）を参照。
