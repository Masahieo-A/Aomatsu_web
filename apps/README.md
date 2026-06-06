# apps/ フォルダについて

このフォルダには英語学習支援アプリを **1アプリ1フォルダ** で格納します。
全アプリはこの統合リポジトリ（`Aomatsu_web`）内で管理します。

## フォルダ命名規則

- `app-用途名`（すべて小文字、単語区切りはハイフン）
- 機能が一目でわかる名前にする
- 例: `app-cloze-maker` / `app-seijo-maker` / `app-elsa-like`

## 各アプリが持つべきファイル

```
apps/app-xxx/
├── README.md             ← アプリ技術仕様（開発者向け・必須）
├── package.json          ← Next.js アプリの場合
├── app/ components/ ...   ← ソース
└── .env.example          ← 環境変数を使う場合（値は空/ダミー）
```

> ⛔ `node_modules` / `.next` / `.env*` はコミットしない（ルート `.gitignore` で除外済み）。

## 現在登録されているアプリ

| フォルダ | App ID | アプリ名 | カテゴリ | スタック |
|---|---|---|---|---|
| `app-eisaku-tensaku` | APP001 | 英作文 文法添削 | ライティング | Next.js + Gemini |
| `app-seijo-maker` | APP002 | 整序メーカー | 文法 | Next.js |
| `app-cloze-maker` | APP003 | Cloze Test Maker | 文法 | Next.js |
| `app-cloze-seijo-maker` | APP004 | Cloze + 整序メーカー | 文法 | Next.js + Supabase |
| `app-elsa-like` | APP005 | 発音チェック（ELSA風） | リスニング | 静的HTML |

各アプリの詳細（URL・GitHub・環境変数）は [../PROJECTS.md](../PROJECTS.md) と
[../docs/deployment.md](../docs/deployment.md) を参照。

---

新しいアプリの追加手順・命名規則・デザイン方針は
[親フォルダの README.md](../README.md) および [docs/](../docs/) を参照してください。
