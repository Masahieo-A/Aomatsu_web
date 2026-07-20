# Vision Quest風問題メーカー（app-vq-question-maker）

英文を入力すると、**空欄補充・答え・Tip（思考誘導）・解説**を生成する教員向けアプリ。
Vision Quest Insight 風に「語順の暗記」ではなく「文法の考え方」を問う問題を作る。

- **フロントエンド**: Next.js（App Router / TypeScript）
- **バックエンド**: FastAPI（PDF OCR・Word/Excel エクスポート用 API）
- **対象**: 教員（問題作成）

English Hub ポータルの1アプリ。画面左上のヘッダーからポータルへ戻れる。

---

## 機能

- 複数英文をまとめて入力し、1文ごとに問題化
- 入力英文ごとに日本語訳（ローカルの簡易下訳）を付与
- 文法項目を「まとめて設定」「個別に設定」から選択（時制・完了形・受動態・不定詞・関係詞・無生物主語など18項目）
- 各英文ごとに文法項目と空欄数を指定可能
- few-shot prompt プレビューを画面内に表示
- `frontend/data/vision-quest-insight.json` の教材DBから類似 few-shot 例を動的選択
- `/api/generate` で OpenAI API と連携。`OPENAI_API_KEY` 未設定時はDB類似例のみを返すフォールバック動作

---

## 起動方法

### フロントエンド（Next.js）

```bash
cd frontend
npm install
npm run dev        # 開発サーバ（既定 http://localhost:3000）
# 本番ビルド確認は npm run build && npm run start
```

OpenAI API 連携を使う場合は `frontend` に環境変数を設定する（未設定でもDB類似例のみで動作）。

```bash
# frontend/.env.local
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4.1-mini
```

### バックエンド（FastAPI）

PDF OCR や Word/Excel エクスポート用の API。フロントエンドの問題生成のみを使う場合は不要。

```bash
cd backend
python -m venv .venv && source .venv/bin/activate   # 任意
pip install -r requirements.txt
uvicorn app.main:app --reload                        # 既定 http://localhost:8000
```

---

## ディレクトリ構成

```
app-vq-question-maker/
├── frontend/                      # Next.js アプリ
│   ├── app/
│   │   ├── layout.tsx             # ポータルへ戻るヘッダー / メタ情報
│   │   ├── page.tsx               # 問題生成 UI・生成ロジック
│   │   ├── globals.css            # トンマナ（English Hub 緑基調）
│   │   └── api/generate/route.ts  # OpenAI 連携 API ルート
│   ├── lib/insightDataset.ts      # 教材DBからの類似例選択・prompt 構築
│   └── data/vision-quest-insight.json # 教材DB（few-shot 例）
├── backend/                       # FastAPI（OCR / エクスポート API）
│   ├── app/main.py
│   └── requirements.txt
└── docs/                          # 構成・要件定義
```

開発者向け情報は [docs/構成.md](docs/構成.md)、機能要件は [docs/要件定義.md](docs/要件定義.md) を参照。
