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

| フォルダ | App ID | アプリ名 | 対象 | カテゴリ | スタック |
|---|---|---|---|---|---|
| `app-eisaku-tensaku` | APP001 | 英作文 文法添削 | 生徒 | ライティング | Next.js + Gemini |
| ~~`app-seijo-maker`~~（退役・`app-cloze-seijo-maker` に統合） | APP002 | 整序メーカー | 生徒 | 文法 | Next.js |
| ~~`app-cloze-maker`~~（退役・`app-cloze-seijo-maker` に統合） | APP003 | Cloze Test Maker | 生徒 | 文法 | Next.js |
| `app-cloze-seijo-maker` | APP004 | Cloze + 整序メーカー | 生徒 | 文法 | Next.js + Supabase |
| `app-elsa-like` | APP005 | 発音チェック（ELSA風） | 生徒 | リスニング | 静的HTML |
| `app-sodateru-ai` | APP006 | 育てるAI | 生徒 | 文法 | Next.js + Supabase |
| `app-zdp` | APP007 | 英文法つまずき診断 | 生徒 | 文法 | Next.js（npm workspaces） |
| `app-viewpoint` | APP008 | 着眼点③ and/but/or の分析 | 生徒 | 文法 | 静的HTML |
| `app-tankyu-support` | APP009 | 探究ファシリテーターAI | 生徒 | ユーティリティ | Next.js + Gemini |
| `app-sogo-tankyu-report` | APP010 | 総合探究発表会サイト | 生徒 | ユーティリティ | 静的HTML + Apps Script |
| `app-3d-modeling` | APP011 | 3Dルームビューアー | 生徒 | ユーティリティ | React Three Fiber + Firebase |
| `app-mirai-library` | APP012 | 未来の図書館 | 生徒 | ユーティリティ | Next.js + NextAuth + Supabase |
| `app-html-maker` | APP013 | Viewpoint 教材オーサリング | 教員 | 教材作成 | Next.js（BYOK対応） |
| `app-oral-exam-generator` | APP014 | 口頭試問プリント生成ツール | 教員 | 作問 | Next.js + Gemini（ローカル専用） |
| `app-vq-question-maker` | APP015 | Vision Quest風問題メーカー | 教員 | 作問 | FastAPI + Next.js |
| `app-parent-teacher-meeting` | APP016 | 保護者懇談会 日程調整 | 教員 | 校務 | 静的HTML + xlsx |
| `app-heigan-navi` | APP017 | 併願照合ナビ（HeiganNavi） | 教員 | 進路指導 | Next.js |
| `app-aomatsu-mondo` | APP018 | 青松問答 | 教員 | AI構築 | Next.js + Supabase |

- **生徒向け**アプリはポータルトップ（`/index.html`）のカードに掲載する。
- **教員向け**アプリは教員用ページ（`/admin/index.html`）のカードに掲載する（トップのフッター「教員用」リンクから遷移）。

各アプリの詳細（URL・GitHub・環境変数）は [../PROJECTS.md](../PROJECTS.md) と
[../docs/deployment.md](../docs/deployment.md) を参照。

---

新しいアプリの追加手順・命名規則・デザイン方針は
[親フォルダの README.md](../README.md) および [docs/](../docs/) を参照してください。
