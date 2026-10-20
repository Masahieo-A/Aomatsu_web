# 画面実装ブリーフ（画面担当サブエージェント共通）

アプリ: `~/Projects/aomatsu-web/apps/app-print-or-not`（以下 APP）。Next.js 16.2（App Router）+ React 19 + TypeScript + Tailwind v4。

## 最初に読むもの
- `APP/docs/3Dfood_site_requirements.md`（担当画面の節と §4・§5・§7）
- 共通の約束（**編集禁止**。変更が必要なら返答で提案する）:
  - `APP/src/lib/types.ts` 型の正本
  - `APP/src/lib/store.tsx` `useStudent()`（state / settings / update / sync）。保存は必ず `update(s => ({...s, ...}))` で行う
  - `APP/src/lib/progress.ts` 自分の側・ゲート判定（`mySide`, `gateItems`, `isWritingUnlocked`）
  - `APP/src/lib/text.ts` 文分割・語数・コピペ判定・伏せ数字置換
  - `APP/src/lib/content.ts` 記事・論点・既定設定の取得
  - `APP/src/app/globals.css` 共通クラス（`.page .page-title .section-title .box .muted .btn .btn-secondary .btn-small .field-label .field .error-text`、色 `text-pro bg-pro-dim text-con bg-con-dim border-line text-muted bg-accent-dim` など）
  - `APP/src/components/SideBadge.tsx` `RequireStudent.tsx` `AppHeader.tsx`
- Next.js はバージョンが新しい。書く前に `APP/node_modules/next/dist/docs/` の該当ページを確認（例: 動的ルートの `params` は Promise）。

## デザインのルール
- ページ背景は白のまま。背景色の帯・グラデーション・大きな色面を作らない。色は小さなバッジ・枠線・ボタン程度。
- **キャッチコピー・煽り文・飾りの見出し・絵文字の多用を入れない**（例:「さあ、未来の食卓へ！」「あなたの考えを深めよう」は不可）。画面に出す文は、操作の説明と必要な情報だけ。短く。
- 生徒向けの指示は日本語で短く。活動名・本文・選択肢は英語。
- モバイルファースト。360px 幅で横スクロールなし。タップ領域 44px 以上。本文 16px 以上・行間 1.7。
- 賛成＝青＋▲、反対＝橙＋■（`SideBadge` を使う）。色だけで正誤・状態を伝えない（✓・文字を併記）。
- ポイント・ランキング等のゲーム化はしない。

## コードのルール
- 生徒画面は `"use client"` のページで `RequireStudent` で包む: `<RequireStudent>{(s) => <Inner s={s} />}</RequireStudent>`。
- コメントは日本語で「なぜ」だけ。ファイル名: コンポーネントは PascalCase.tsx、その他 kebab-case.ts。
- 依存パッケージを追加しない。担当外のファイルを編集しない。git・削除・デプロイ・`npm install` はしない。
- 自由記述は React の通常描画（`dangerouslySetInnerHTML` 禁止）。
- 確認: `cd APP && npx tsc --noEmit` と `npx eslint <自分のファイル>` がエラー0。（他の担当が並行作業中なので `next build` や `next dev` は起動しない。記事JSONは別担当が書き換え中で、仮置きの間は中身が短い）

## 返答
200字以内: 作成ファイル一覧（ルート相対）、tsc/eslint 結果、共通ファイルへの変更提案（あれば）。コード全文は返さない。
