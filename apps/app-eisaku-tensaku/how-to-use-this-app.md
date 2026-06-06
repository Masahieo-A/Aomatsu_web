# 英作文 文法添削アプリ — 利用開始手順

## 概要

高校生の英作文を文法の観点からAIが評価し、3段階のヒントを提供するWebアプリです。
AIは英文を書き直しません。ヒントをもとに生徒自身が修正することを目的としています。

---

## 必要なもの

| 項目 | 備考 |
|---|---|
| Gemini API Key | Google AI Studio で無料発行可 |
| Vercel アカウント | デプロイ先（無料プラン可） |
| GitHub アカウント | ソースコード管理用 |

---

## セットアップ手順

### 1. Gemini API Key の取得

1. [Google AI Studio](https://aistudio.google.com/) にアクセス
2. 右上「Get API key」→「Create API key」をクリック
3. 生成されたキー（`AIza...` で始まる文字列）をコピーして保管

### 2. Vercel に環境変数を設定

1. [Vercel ダッシュボード](https://vercel.com/masahiro-as-projects/eisaku-tensaku-app) を開く
2. **Settings** → **Environment Variables** をクリック
3. 以下を入力して「Save」

| Key | Value | Environment |
|---|---|---|
| `GEMINI_API_KEY` | 手順1で取得したAPIキー | Production / Preview / Development（すべて） |

4. 設定後、**Deployments** タブ → 最新のデプロイ右の「…」→「Redeploy」を実行

### 3. 動作確認

1. [eisaku-tensaku-app.vercel.app](https://eisaku-tensaku-app.vercel.app) を開く
2. テーマ・語数・英文を入力して「AIフィードバックを取得」をクリック
3. 語数チェック・良い点・ヒントカードが表示されれば正常動作

---

## よくあるエラーと対処法

| エラーメッセージ | 原因 | 対処 |
|---|---|---|
| 「Gemini API キーがサーバーに設定されていません」 | 環境変数未設定 or Redeploy未実施 | 手順2を再確認し、Redeployを実行 |
| 「API キーが無効か、利用が拒否されました」 | APIキーが正しくない or 無効化されている | Google AI Studio でキーを再発行 |
| 「サーバーが混み合っています」 | Gemini APIのレート制限 | 少し待ってから再送信 |
| 添削中のまま止まる | ネット接続切断 | 接続を確認して再試行 |

---

## 辞書機能について

辞書機能は外部APIを使用しており、追加設定は不要です。

| 機能 | 使用API | 認証 |
|---|---|---|
| 日本語 → 英語候補 | [Jisho.org API](https://jisho.org/api/v1/search/words) | 不要 |
| 英語 → 類義語 | [Datamuse API](https://api.datamuse.com/) | 不要 |

---

## ソースコード・リポジトリ

- **GitHub**: [Masahieo-A/eisaku-tensaku-app](https://github.com/Masahieo-A/eisaku-tensaku-app)
- **Vercel**: [masahiro-as-projects/eisaku-tensaku-app](https://vercel.com/masahiro-as-projects/eisaku-tensaku-app)
- **技術仕様**: `README.md` を参照
