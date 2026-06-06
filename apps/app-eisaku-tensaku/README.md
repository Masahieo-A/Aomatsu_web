# 英作文 文法添削（eisaku-tensaku-app）

高校生向けの英作文を、Gemini API で文法面から評価し、ヒントのみを返す Next.js アプリです。英文の丸写し修正は行いません。

## 必要環境

- Node.js 20 以上（推奨）
- [Google AI Studio](https://aistudio.google.com/apikey) で発行した Gemini API キー

## ローカルでの起動

1. 依存関係のインストール（初回）

   ```bash
   cd eisaku-tensaku-app
   npm install
   ```

2. 環境変数

   `.env.example` を `.env.local` にコピーし、`GEMINI_API_KEY` に実際のキーを設定します。

   ```bash
   cp .env.example .env.local
   ```

3. 開発サーバー

   ```bash
   npm run dev
   ```

   ブラウザで [http://localhost:3000](http://localhost:3000) を開きます。

4. 本番ビルドの確認

   ```bash
   npm run build
   npm start
   ```

## 主な仕様

- 入力画面 `/`、結果画面 `/result`
- 添削結果は `sessionStorage` で受け渡し（DB なし）
- API キーはサーバー（`POST /api/evaluate`）のみで使用
- 語数極小ガード（クライアントと API の二重チェック）
- 段階的ヒント（Level 1〜3）

要件の詳細はリポジトリ同梱の `docs/要件定義.md`、**AI（Gemini API）の利用とプロンプト仕様は `docs/AIプロンプト仕様.md`**、システムプロンプト本体は `lib/prompt.ts` を参照してください。

## GitHub へ push する手順

このフォルダはすでに `git init` 済みで、初回コミットが `main` にあります。GitHub 上に**空の**リポジトリ（README なし）を新規作成してから、次のように接続して push してください（`YOUR_USER` と `YOUR_REPO` を置き換え）。

```bash
cd eisaku-tensaku-app
git remote add origin git@github.com:YOUR_USER/YOUR_REPO.git
git branch -M main
git push -u origin main
```

SSH ではなく HTTPS を使う場合は、`origin` の URL を `https://github.com/YOUR_USER/YOUR_REPO.git` にします。

## Vercel へのデプロイ

1. 上記の手順で GitHub に push する。
2. [Vercel](https://vercel.com) で New Project → 当該リポジトリを選択。
3. **Environment Variables** に **`GEMINI_API_KEY`** を登録する（値は Google AI Studio のキー）。
4. 変数の **Environment** で、**Production** だけでなく **Preview** にもチェックを入れる（プレビュー URL からも添削したい場合に必須）。
5. Deploy / 再デプロイを実行する。

**重要:** ローカルの `.env.local` は **GitHub に含めず、Vercel にも自動では届きません。** 本番・プレビューで添削 API を使うには、必ず Vercel ダッシュボードで上記を設定してください。未設定の場合、送信時にエラーになります（画面に設定手順のメッセージを表示します）。

## Gemini API まわりの注意

- このリポジトリでは **API の自動リトライ（ループ）をアプリ側で行いません**（SDK の HTTP 再試行は `attempts: 1` に制限）。
- モデル名は `lib/gemini.ts` の `GEMINI_MODEL`（既定: `gemini-2.5-flash`）です。利用できない場合は、Google のモデル一覧を確認のうえ、動作確認後に変更してください。

## ライセンス

私的・教育利用の想定です。利用条件はプロジェクト管理者に従ってください。
