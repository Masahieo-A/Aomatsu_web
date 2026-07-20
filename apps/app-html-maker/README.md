# Viewpoint — 教材オーサリング（app-html-maker）

英語の複雑な文構造を、樹形図・色分け・注釈で「視覚的に分かる教材」として作り、自己完結HTMLで生徒に即共有できる**教員向け** Next.js アプリです。AI生成を出発点に、教員がノード単位（見出し・段落・単語1語・樹形図の枝・表のセル・注釈）で細部まで編集します。

- 中核思想: **見た目（HTML）を直接いじらない。** 教材を「意味の単位（ノード）」の集合データ（`LessonDoc`）として持ち、描画はそこから自動生成。編集は常にデータに対して行うため undo/redo も自明。
- 教材データの保存先は**ブラウザの localStorage のみ**（DBなし）。書き出したHTMLにはデータが埋め込まれ、**配布物がそのままバックアップ**になります。

このフォルダは monorepo `aomatsu-web` に統合済みのコピーです（原本: `~/Projects/html_maker`）。ポータルのトンマナ（`docs/design-system.md` の緑基調・ポータルへ戻るヘッダー）を適用しています。

## 必要環境

- Node.js 20 以上（推奨）
- AI生成・編集を使う場合は Anthropic（Claude）または Google（Gemini）の API キー
  - Claude: https://console.anthropic.com/
  - Gemini: https://aistudio.google.com/apikey

## ローカルでの起動

1. 依存関係のインストール（初回）

   ```bash
   cd apps/app-html-maker
   npm install
   ```

2. 環境変数（任意）

   `.env.example` を `.env.local` にコピーし、必要なキーを設定します。BYOK（下記）だけで使う場合は不要です。

   ```bash
   cp .env.example .env.local
   ```

3. 開発サーバー

   ```bash
   npm run dev
   ```

   ブラウザで [http://localhost:3000](http://localhost:3000) を開きます。

4. テスト / 本番ビルド

   ```bash
   npm test        # vitest（export/import/validate）
   npm run build
   npm start
   ```

## API キーの入れ方（2方式に対応）

### 方式A：サーバー環境変数（推奨・UI入力不要）

Vercel の **Settings → Environment Variables** に登録します。

| 変数名 | 用途 |
|---|---|
| `ANTHROPIC_API_KEY` | Claude を使う場合（`sk-ant-...`） |
| `GEMINI_API_KEY` | Gemini を使う場合（`AIza...`） |
| `APP_PASSCODE` | **推奨**: サーバーキー利用時のアクセス合言葉（未設定だと URL を知る第三者があなたのキー枠で AI を呼べる） |

判定用エンドポイント [`/api/config`](./app/api/config/route.ts) は真偽のみを返し、キー値は返しません。全 AI 系 API に IP 単位の簡易レートリミット（30回/分）を実装しています。

### 方式B：BYOK（ブラウザにキーを保持）

アプリ内「⚙ AI 設定」でユーザー自身のキーを入力すると localStorage に保存され、そのキーで生成・編集します。サーバー環境変数は不要です。

## 主な画面

- `/` — 教材一覧（作成・複製・削除、全教材の一括バックアップ/復元）
- `/new` — PDF をアップロードして AI で下書き生成
- `/import` — 既存 HTML の取り込み（無劣化復元／デザイン維持／簡易・AI 構造化）
- `/editor/[id]` — ノード単位エディタ（右インスペクタ、undo/redo、HTML 書き出し）

## デプロイ（Vercel）

- **静的アプリではありません。** `app/api/*`（generate / edit / import / models / config）はサーバー実行が必要なため、ポータルの静的デプロイに相対リンクで同梱することはできません。**独立した Vercel プロジェクト**が必要です。
- 手順: Vercel で当該プロジェクトの **Connected Repository = `Masahieo-A/Aomatsu_web`**、**Root Directory = `apps/app-html-maker`** を設定（Vercel 設定変更はオーナーが手動で実施）。
- 環境変数（方式A・`APP_PASSCODE`）は **Production/Preview 双方**に設定。

詳細な要件・設計は同梱の [`docs/要件定義.md`](./docs/要件定義.md) / [`docs/構成.md`](./docs/構成.md) を参照してください。

## ライセンス

私的・教育利用の想定です。利用条件はプロジェクト管理者に従ってください。
