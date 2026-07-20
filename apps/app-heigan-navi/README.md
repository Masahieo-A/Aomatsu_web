# 併願照合アプリ（HeiganNavi / app-heigan-navi）

進路指導・面談用の併願校照合ツール。第一志望の入試方式を基準に、併願候補校の**科目充足・日程被り・入学金（手続締切）先払い・検定料**を横断照合し、面談中に根拠資料を即提示できる Next.js アプリです。教員向け（teacher）。

> **統合リポジトリ内での位置づけ**
> 本アプリは学校ポータル monorepo **aomatsu-web** のサブアプリで、`apps/app-heigan-navi/` に配置されています。トンマナは [`docs/design-system.md`](../../docs/design-system.md)（English Hub デザインシステム）に準拠し、全画面の左上にポータルへ戻る共通ヘッダーを設置しています。
>
> **本番 URL: https://heigan-search.vercel.app**

## 主な機能

1. **第一志望の選択** — 大学 → 学部 → 学科を絞り込み、入試方式カードを表示。
2. **基準方式の科目確定** — 選択科目（社会・理科など）の中身を面談中に指定。
3. **併願候補の照合** — 候補大学を複数選び、基準科目（または手動指定科目）で各方式の受験可否を判定。
4. **日程照合** — 比較対象にチェックした方式の試験日・出願期間をカレンダー表示し、被りを検出。
5. **入学金・費用ビュー** — 手続締切から入学金先払いの発生有無を可視化。
6. **面談サマリー印刷** — 面談結果を印刷用にまとめて出力。

各データ項目には要項出典への根拠ボタン（EvidenceButton）が付き、出典を辿れます。

## 技術スタック

| 項目 | 内容 |
|---|---|
| フレームワーク | Next.js 16.2.10（App Router） |
| ランタイム | React 19.2.4 / TypeScript ^5 |
| スタイリング | Tailwind CSS ^4 |
| データ | 静的 JSON（`data/exam-methods.json` ほか）。外部 API・DB なし |

## ディレクトリ構成

- `app/` — App Router（`layout.tsx` / `page.tsx` / `globals.css`）。単一画面の照合 UI。
- `components/` — UI コンポーネント（`MethodCard` / `BaseSubjectPanel` / `CandidateFilterPanel` / `CandidateResult` / `ScheduleCalendar` / `CostView` / `SummaryPrint` / `EvidenceButton` / `Badge` / `Footer`）。
- `lib/` — 照合ロジックとデータ読み込み（`data.ts` / `judge.ts`（受験可否判定）/ `baseSubjects.ts` / `schedule.ts`（日程被り）/ `format.ts` / `sourceLinks.ts` / `types.ts`）。
- `data/` — 入試方式データ（`exam-methods.json`）と出典リンク（`source-links.json`）。`SAMPLE_DATA_README.md` はデータ形式の説明。
- `docs/` — `年度データ入替RUNBOOK_毎年これを読んでAIに渡す.md`（年度更新の手順書）。
- `大学search/` — データの一次資産（募集要項PDF・txt原本、抽出スクリプト、要件定義書）。2026-07-20 に旧 `~/Projects/heigan-navi/大学search` から移設。年度データ入替はこのフォルダを起点に行う。

## データ更新（年度入替）

入試データは年度ごとに更新します。手順は [`docs/年度データ入替RUNBOOK_毎年これを読んでAIに渡す.md`](docs/年度データ入替RUNBOOK_毎年これを読んでAIに渡す.md) を参照。実データは `data/exam-methods.json` / `data/source-links.json` を差し替えます。

## ローカル開発

```bash
npm install      # 初回のみ
npm run dev      # 開発サーバー（http://localhost:3000）
npm run build    # 本番ビルド確認
npm start        # 本番起動
```

環境変数は不要です（静的データのみで動作）。

## デプロイ

Vercel（本番 URL: https://heigan-search.vercel.app）。
