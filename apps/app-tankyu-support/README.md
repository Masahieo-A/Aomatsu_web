# 探究ファシリテーターAI（tankyu-support）

高校生が「総合的な探究の時間」で地域探究の**テーマ・問い**を立てられるように、Gemini との対話で支援する Next.js アプリです。生徒が9分野からテーマ（X軸）を選び、7つの副次的レンズ（Y軸）をかけ合わせて、探究の「問い」の候補を見つけるところまでを一緒に伴走します。

- フロント/サーバー: Next.js 14（App Router）+ TypeScript + Tailwind CSS
- Markdown 表レンダリング: `react-markdown` + `remark-gfm`
- AI: Google Gemini API（`gemini-2.5-flash`）
- 会話履歴: **保存しません**（ブラウザを閉じるとリセット。`/intersection` 画面用の一時データのみ `sessionStorage` を使用）
- 対象ユーザー: 生徒（高校2年生想定、スマホ・PC両対応）。教員はURL共有のみで管理機能は不要

## ディレクトリ構成

- `app/`: 画面・API Route（`/` チャット画面、`/intersection` 交差点まとめ画面、`app/api/chat`・`app/api/intersection-summary`）
- `components/`: チャット UI 部品
- `lib/`: Gemini 呼び出し / system instruction / レスポンスの JSON スキーマ・パーサ
- `docs/要件定義.md`: 機能要件（仕様書）
- `docs/出力仕様.md`: AIレスポンスのJSON構造とカード化・表示形式の管理
- `docs/構成.md`: 開発者向け構成メモ

> このアプリは元々 `tankyu-support` という独立リポジトリでした。青松 English Hub モノレポ（`aomatsu-web`）への統合にあたり、旧 `web/` 配下の内容をこのフォルダ直下にフラット化し、トンマナ（配色・フォント・ポータルへ戻るヘッダー）をモノレポの [design-system.md](../../docs/design-system.md) に合わせています。ロジック・機能は変更していません。

## 事前準備（必須）

### 1) Gemini APIキーを用意

Google AI Studio などで発行した API キー（`GEMINI_API_KEY`）を使います。

### 2) ローカル開発用に `.env.local` を作成

このフォルダ直下（`apps/app-tankyu-support/`）に `.env.local` を作り、以下を設定してください（このファイルは Git に含めません）。

```env
GEMINI_API_KEY=あなたのGeminiAPIキー
```

※ ひな形は `.env.example` にあります。

## ローカル起動

```bash
cd apps/app-tankyu-support
npm install
npm run dev
```

起動後、ブラウザで `http://localhost:3000` を開きます。

## 本番ビルド確認（推奨）

```bash
npm run build
```

## Vercel デプロイ

モノレポ（`Masahieo-A/Aomatsu_web`）経由でのデプロイを想定していますが、**このアプリはまだ Vercel プロジェクトが未作成・未確認**です（詳細は [../../docs/deployment.md](../../docs/deployment.md) を参照）。新規に接続する場合の設定は以下の通りです。

1. Vercel で `Masahieo-A/Aomatsu_web` を Import（または既存プロジェクトの Connected Repository を切替）
2. **Project Settings → General → Root Directory**: `apps/app-tankyu-support`
3. **Project Settings → Environment Variables** に `GEMINI_API_KEY` を登録（Production / Preview 両方）
4. Build Command / Output は自動検出でOK
5. Deploy

デプロイ後に発行された URL へアクセスして動作確認します。

## よくあるトラブル

- **`.env.local` をコミットしてしまう**: 絶対にしないでください（APIキー漏洩）。ルートの `.gitignore` で除外済みです。
- **Vercelで動かない**: Root Directory が `apps/app-tankyu-support` になっているか、Environment Variables に `GEMINI_API_KEY` を入れたか確認してください。

---

開発者向け情報は [docs/構成.md](docs/構成.md) を、機能要件は [docs/要件定義.md](docs/要件定義.md) を、AIレスポンスの出力仕様は [docs/出力仕様.md](docs/出力仕様.md) を参照。
