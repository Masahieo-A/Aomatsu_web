# CLAUDE.md

総合探究成果報告会の学内限定Webサイト。素のHTML/CSS/JSの静的サイトで、Google Apps Script（`apps-script/`）がスプレッドシートを読み取り `data/schedule.json` を生成、GitHubへの自動コミット経由でVercelがデプロイする構成。

- ローカル確認: `npx serve -l 8080`
- リポジトリ: `git@github.com:Masahieo-A/sogo-tankyu-report.git`

ファイル役割: README.md=公開用 / docs/構成.md=開発者向け構成メモ（詳細はdocs/内の各ドキュメント参照）。
