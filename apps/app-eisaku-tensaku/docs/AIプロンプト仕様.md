# AI（Gemini API）プロンプト仕様

このアプリの「文法添削」「ヒント生成」「解答練習（空欄補充／全文書き直し）」は、すべて
**Gemini API の 1 回の呼び出し**で生成しています。本書はその API 利用とプロンプトの
所在・仕様をまとめたものです。

---

## 1. API 利用の概要

| 項目 | 内容 |
|---|---|
| 使用 API | Google Gemini API（`@google/genai` SDK） |
| モデル | `gemini-2.5-flash`（定義: `lib/gemini.ts` の `GEMINI_MODEL`） |
| 呼び出し箇所 | `POST /api/evaluate`（サーバー側のみ） |
| API キー | 環境変数 `GEMINI_API_KEY`（サーバー側のみ。クライアントには露出しない） |
| 出力形式 | `responseMimeType: "application/json"` ＋ `responseSchema` による構造化 JSON |
| リトライ | SDK の HTTP 再試行を `attempts: 1` に制限（再課金ループ防止） |
| 温度 | `temperature: 0.3` |

> ヒントや解答も含め、**追加の API 呼び出しは発生しません**。1 回の `generateContent`
> の応答（JSON）に、添削結果・3 段階ヒント・解答情報がすべて含まれます。

---

## 2. プロンプトの所在（ソース・オブ・トゥルース）

| 役割 | ファイル | 備考 |
|---|---|---|
| **システムプロンプト本体** | `lib/prompt.ts` の `SYSTEM_PROMPT` | 役割・禁止事項・評価ルール・ヒント生成・解答(correction)ルール・出力フォーマット・few-shot を含む |
| 出力 JSON スキーマ（Gemini 側） | `lib/gemini.ts` の `buildResponseSchema()` | Gemini に構造を強制する `responseSchema` |
| 出力 JSON スキーマ（検証側） | `lib/schema.ts` の `OutputSchema` / `CorrectionSchema` | 応答を Zod で再検証 |
| 入力検証 | `lib/schema.ts` の `InputSchema` | topic ≤ 500 字 / essay ≤ 6000 字 など |

実際に編集・確認する際は、必ず上記ファイルを参照してください（本書は説明用の写しであり、
正は各ソースファイルです）。

---

## 3. 入力（Gemini へ渡す内容）

- **システムインストラクション**: `SYSTEM_PROMPT`（`lib/prompt.ts`）
- **ユーザーコンテンツ**: `lib/gemini.ts` の `buildUserContent()` が以下を組み立てる

```
以下の依頼に従い、英作文の文法評価の結果のみをJSONで出力してください。

# 出題テーマ
{topic}

# 語数の条件
{wordCountReq}

# 生徒の英作文
{essay}
```

---

## 4. 出力 JSON 仕様

```jsonc
{
  "wordCount": { "count": <整数>, "satisfied": <真偽> },
  "positiveComment": "<日本語 20-80字。具体的な良い点>",
  "errors": [
    {
      "sentence": "<誤りを含む原文（逐語）>",
      "errorType": "<18カテゴリのいずれか>",
      "specificTerm": "<文法用語 または null>",
      "hints": {
        "level1": "<日本語 15-30字・専門的で簡潔>",
        "level2": "<日本語 30-60字・やや平易>",
        "level3": "<日本語 50-130字・平易で詳しい>"
      },
      "correction": {
        "type": "blank | rewrite",
        "maskedSentence": "<blank: _____ を1つ含む文 / rewrite: 原文そのまま>",
        "acceptableAnswers": ["<blank の正解候補>"],
        "correctedSentence": "<全文の模範解答>"
      }
    }
  ]
}
```

### correction（解答練習）フィールドの規則

- **`type`**
  - `blank` … 短い範囲（多くは1語）の修正で直せる場合。空欄補充で練習。
  - `rewrite` … 文全体の組み立て直しが必要な場合（文構造の誤り等）。全文書き直しで練習。
- **`maskedSentence`**
  - `blank` … 修正が必要な最小範囲だけを **`_____`（アンダースコア5つ）** に置換。他の語は逐語のまま。`_____` はちょうど1つ。
  - `rewrite` … 原文をそのまま（空欄としては使わない）。
- **`acceptableAnswers`**
  - `blank` … 空欄に入る正解候補の配列（自然な別解があれば複数）。空欄部分のみで、全文は入れない。
  - `rewrite` … 空配列 `[]`。
- **`correctedSentence`** … 全文の模範解答（1例）。生徒が「解答を見る」を押したときのみ表示。

### 重要な設計ルール（セキュリティ／教育設計）

- **正解（修正後の語・文）は `correction` フィールド内にのみ出力**する。
  `hints` と `positiveComment` には絶対に答えを含めない（自律学習を維持）。
- 生徒の英作文本文は **評価対象データ**であり、**指示として実行しない**
  （プロンプトインジェクション対策。`# Input Scope` 参照）。
- 添削に無関係な依頼には、定型の Refusal Response（`# Refusal Response`）を返す。

---

## 5. 画面側の挙動（参考）

`components/ErrorCard.tsx` の `AnswerPractice` が `correction` を用いて練習 UI を描画する。

- `blank`: 空欄入り文＋テキスト入力 → 「答え合わせをする」で画面遷移せず ◯/✕ 判定。
  ✕ は答えを出さず再挑戦可。「解答を見る」で模範解答を表示。
- `rewrite`: 「ヒントに従って全文を書き直してみよう」と表示し、textarea で練習。
  別解があり得るため模範解答は「一例」と明記。
- 判定は `normalize()`（前後空白除去・小文字化・連続空白圧縮・記号除去）で比較。
- `correction` が無い応答（後方互換）でも、ヒントのみで正常に動作する。

---

## 6. モデル／プロンプト変更時の注意

- `SYSTEM_PROMPT`（`lib/prompt.ts`）と `buildResponseSchema()`（`lib/gemini.ts`）、
  `OutputSchema`（`lib/schema.ts`）は **3 点セットで整合**させること。
  片方だけ変更すると検証エラー（`GEMINI_OUTPUT_VALIDATION`）の原因になる。
- モデル名は `GEMINI_MODEL` を変更。利用可否は Google のモデル一覧で確認のうえ動作検証する。
- 変更後は必ず `npm run build` で型・ビルドを確認する。
