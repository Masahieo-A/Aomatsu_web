# 総合探究成果報告会サイト（app-sogo-tankyu-report）

青松 **English Hub**（`aomatsu-web` モノレポ）のサブアプリ。富田高校・総合探究成果報告会の**学内限定Webサイト**です。探究発表会の**スケジュール一覧**と**各グループの資料（PDF）**を閲覧できます。

- 種別: 素の HTML / CSS / JS の静的サイト（フレームワークなし）
- 対象: 生徒（発表会当日の閲覧）
- 本番URL: https://sogo-happyo.vercel.app
- ポータル: 画面左上の「🌿 English Hub」からポータルへ戻れます（`docs/design-system.md` 準拠）

データの更新は **Google スプレッドシートのメニュー操作だけ**で完結します（Classroom 提出 → PDF 変換 → サイト反映まで自動）。

## 運用フロー（概要）

```
生徒が Classroom に Google Slides を提出
        ↓
スプレッドシート「📋 発表会サイト管理」→「⚡ すべて一括実行」
  ① Classroom から提出物を取得（メールでグループに紐付け）
  ② Drive 上で PDF に変換・「組織内のみ」で共有
  ③ data/schedule.json を生成して GitHub にプッシュ
        ↓
Vercel が自動デプロイ → サイトに反映
```

## 構成

```
├── index.html          スケジュール一覧（トップページ）
├── group.html          グループ詳細（PDF埋め込み）
├── common.js           共通処理（データ読込・URL検証・Googleログインゲート）
├── schedule.js         一覧ページの表示・検索・ソート
├── group.js            詳細ページの表示
├── style.css           スタイル（English Hub 共通トンマナ適用済み）
├── data/schedule.json  スケジュールデータ（Apps Script が自動更新）
├── apps-script/        スプレッドシートに貼る Google Apps Script 一式
├── sample/             デモ用サンプルデータ（架空の内容）
├── teacher-guide.html  教員向け操作ガイド・実務編（本番非公開）
├── admin-guide.html    管理者向けガイド・技術編（本番非公開）
├── docs/               開発者向けドキュメント（DATA_SCHEMA / DEPLOY / DRIVE_FOLDER / 構成）
├── vercel.json         セキュリティヘッダー（CSP 等）
└── .vercelignore       本番サイトに含めないファイルの指定
```

## セキュリティ設計

| 対象 | 保護のしくみ |
|------|--------------|
| サイトの閲覧 | 「設定」シートで `Allowed Domain` / `Google Client ID` を設定すると、学校の Google アカウントでのログインを要求（閲覧ゲート） |
| PDF の中身 | Google Drive の共有「**組織内のみ**」。リンクが漏れても組織外からは開けない（本命の保護） |
| GitHub トークン | シートに置かず、メニュー「🔑 GitHub トークンを設定」から Apps Script のスクリプト プロパティに保存 |
| 内部資料 | `teacher-guide.html`・`admin-guide.html`・`docs/`・`apps-script/` は `.vercelignore` で本番から除外 |

## トンマナ

`aomatsu-web/docs/design-system.md`（English Hub 共通デザインシステム）に準拠。
落ち着いた緑基調（`--accent: #2d6a4f`）、`Noto Sans JP` ＋システムフォント、全画面の左上にポータルへ戻る導線を設置。発表会サイトとしての既存レイアウト（ヒーロー・検索・スケジュール表）は維持しています。

## ローカルで確認

```bash
npx serve -l 8080
```

- 一覧: http://localhost:8080/
- 詳細: http://localhost:8080/group.html?group_id=101

※ ルートの `serve.json`（`cleanUrls: false`）により、本番（Vercel）と同じ URL 挙動になります。

## デプロイ

GitHub（`Masahieo-A/sogo-tankyu-report`）へ push すると Vercel が自動デプロイします。詳細は [`docs/DEPLOY.md`](docs/DEPLOY.md)、開発者向け構成は [`docs/構成.md`](docs/構成.md) を参照。

---
許可なく複製・転載・転用することを固く禁じます。
