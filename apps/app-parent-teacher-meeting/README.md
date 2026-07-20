# 保護者懇談会 日程調整（app-parent-teacher-meeting）

保護者懇談会の日程希望をタップ入力で集め、教員側で重複なく自動割り当てできる教員向けWebアプリです。

## 主な機能

- **保護者入力画面**: 出席可能な時間帯をタップして○を付け、希望を送信
- **教員管理画面**: 提出状況の一覧確認、デモデータ投入、バックアップ／復元（JSON）、Excel出力
- **自動割り当て**: 各家庭の希望枠内で重複なく最大数を割り当てる最適化（最大マッチング）
- **編集画面**: 学校名・クラス名・提出期限、時間枠・カレンダーの生成/編集

## 技術構成

- フレームワークなし。静的 HTML / CSS / バニラ JS（`index.html`, `style.css`, `app.js`）
- Excel 出力に [SheetJS](https://sheetjs.com/)（`xlsx.full.min.js`）を使用
- データはブラウザの `localStorage` に保存（サーバー・外部DB通信なし）
- ビルド不要。`index.html` を開くだけで動作確認可能

## ローカルでの確認

```bash
cd apps/app-parent-teacher-meeting
open index.html
# もしくはローカルサーバー
npx serve .
```

## デプロイ

このアプリは独立した Vercel プロジェクト（`parent-teacher-meeting`）としてデプロイされており、本番URLは以下です。

- 本番: https://parent-teacher-meeting.vercel.app

モノレポには構成管理・ポータル連携のためにコードを集約していますが、現時点では Vercel の Connected Repository・デプロイ元は個別リポジトリ（`Masahieo-A/parent-teacher-meeting`）のままです。モノレポ経由でのデプロイに切り替える場合は [docs/deployment.md](../../docs/deployment.md) の「モノレポ移行時の手順」に従い、オーナー承認の上で実施してください。

## 関連ドキュメント

- [docs/構成.md](docs/構成.md) — 開発者向け構成メモ
- 移設元（変更禁止のオリジナル）: `~/Projects/parent-teacher-meeting/`
