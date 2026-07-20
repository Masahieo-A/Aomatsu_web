# CLAUDE.md

英文の空欄補充問題を自動生成する Next.js アプリ（FastAPI製OCR APIを併設）。

- フロントエンド: Next.js 14.2.4 / React 18.3.1 / TypeScript 5.4.5（`frontend/`）
- バックエンド: Python FastAPI（`backend/`, OCR・Word/Excelエクスポート用）
- 主要コマンド: `cd frontend && npm run dev` / `cd backend && uvicorn app.main:app --reload`
- GitHubリポジトリ: 未設定（このローカルコピーにリモート設定なし）

ファイル役割: README.md=公開用 / docs/要件定義.md=機能要件（バイブコーディング時の正） / docs/構成.md=開発者向け構成メモ。
