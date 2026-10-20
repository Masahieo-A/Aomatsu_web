# PRINT or NOT?

高校3年生向けの期間限定 Web アプリ。Writing 課題「Should 3D-printed food become more widespread, or should it be restricted?」の準備として、賛成側・反対側の短い記事を読み、根拠を Evidence Card に整理してから Writing Builder で書く。生徒の立場・Card・ヒント開示は共有DB（Supabase）に保存され、教員が分布と Card 一覧を確認して CSV で出力できる。生徒の識別子は「クラス＋出席番号」のみで、氏名・メールは保存しない。

## 画面一覧

| パス | 画面 |
|---|---|
| `/` | S0 Start（クラス・出席番号） |
| `/hook` | S1 Hook（クイズ・立場メーター） |
| `/map` | S2 Article Map |
| `/read` | S3 Reader |
| `/card` | S4 Evidence Card |
| `/sort` | S5 Emotion or Evidence? |
| `/trap` | S5-2 Trap or Treasure? |
| `/write` | S7 Writing Builder |
| `/teacher` | T1 教員用（パスコード） |

## ローカル起動

```bash
cd apps/app-print-or-not
npm install
cp .env.example .env.local   # 必要なら編集
npm run dev                  # http://localhost:3000
```

Supabase の環境変数が無い開発環境では、共有DBの代わりに `.data/dev-db.json`（git 管理外）に保存される。本番（`NODE_ENV=production`）で Supabase が未設定の場合は共有DBを使わず、生徒の端末内にだけ保存される（教員画面の集計は出ない）。

## 環境変数（`.env.example`）

| キー | 内容 |
|---|---|
| `SUPABASE_URL` | Supabase プロジェクトの URL |
| `SUPABASE_SERVICE_ROLE_KEY` | service role キー。サーバー専用。ブラウザや公開リポジトリに出さない |
| `TEACHER_PASSCODE` | 教員画面のパスコード。8文字以上。未設定だと教員 API はすべて拒否する |

## Supabase の設定手順

1. [supabase.com](https://supabase.com) でプロジェクトを作成する。
2. 左メニュー「SQL Editor」で New query を開き、`supabase/schema.sql` の中身を貼り付けて Run する。
3. 「Project Settings > API」で Project URL と service_role キーを控える。
4. Vercel の「Settings > Environment Variables」に `SUPABASE_URL`、`SUPABASE_SERVICE_ROLE_KEY`、`TEACHER_PASSCODE` を追加し、再デプロイする。

生徒はログインしないため、全テーブルで RLS を有効にしてポリシーを作らず、DB へのアクセスを Next.js の API（service role）経由だけに限定している。レート制限（同一 IP で1分120回）はサーバーのメモリ上で数えるので、学校の同一回線から多数が一斉に送ると一時的に「送信が多すぎます」となり、端末が自動で再送する。

## 課題終了後のデータ削除

次のどちらか。どちらも元に戻せないので、先に教員画面で CSV を保存する。

- 教員画面（`/teacher`）の「データ削除」で `DELETE` と入力して実行する。
- Supabase の SQL Editor で `supabase/purge.sql` を実行する。

students・cards・hint_logs を削除する。設定（クラス一覧など）は残る。

## 記事データの差し替え

記事は `src/data/articles/*.json`（pro-01〜04、con-01〜04）。形式は `src/lib/types.ts` の `Article`。差し替えたら次で形式と語数などを検査する。

```bash
npm run check:articles
```

記事を追加・削除する場合は `src/lib/content.ts` の `ARTICLES` も更新する。
