# PRINT or NOT?

高校3年生向けの期間限定 Web アプリ。Writing 課題「Should 3D-printed food become more widespread, or should it be restricted?」の準備として、賛成側・反対側の短い記事を読み、根拠を Evidence Card に整理してから Writing Builder で書く。

DB・外部API・環境変数は使わない。生徒の作業（立場・Card・下書き）は**その端末のブラウザ内（localStorage）だけ**に保存され、サーバーには送られない。完成した本文はコピーして Google Classroom に提出する。出席番号などの入力はなく、開くとすぐ記事を探せる。端末を別の生徒が使うときは、トップ下の「この端末の記録を消す」で最初からにする。

## 画面一覧

| パス | 画面 |
|---|---|
| `/` | 記事を探す（左2/3：課題・検索・進め方と最初の立場、右1/3：全記事一覧）。旧 S0/S2 を統合 |
| `/hook` | S1 Warm-up（True or False・任意） |
| `/read/[id]` | S3 Reader |
| `/card/[id]` | S4 Evidence Card |
| `/sort` | S5 Emotion or Evidence? |
| `/trap` | S5-2 Trap or Treasure? |
| `/stance` | S6 Stance Check |
| `/write` | S7 Writing Builder |

## ローカル起動

```bash
cd apps/app-print-or-not
npm install
npm run dev                  # http://localhost:3000
```

## 教員が変えられる設定

`src/data/settings-default.json` を編集して push する。

| キー | 内容 | 既定 |
|---|---|---|
| `soWhatJaAllowed` | So what? を日本語でも可にする | false |
| `wordMin` / `wordMax` | Writing Builder の目標語数 | 130 / 170 |
| `trapRequired` | Trap or Treasure? を Writing Builder の必須条件にする | false |

「本物 or 印刷？」クイズの写真は `src/data/hook.json` の `photos` に入れる（自作・CC0 素材のみ。`public/hook/` に置く）。空のときはクイズ自体を表示しない。

## 記事データの差し替え

記事は `src/data/articles/*.json`（pro-01〜04、con-01〜04）。形式は `src/lib/types.ts` の `Article`。差し替えたら次で形式と語数などを検査する。

```bash
npm run check:articles
```

記事を追加・削除する場合は `src/lib/content.ts` の `ARTICLES` も更新する。
