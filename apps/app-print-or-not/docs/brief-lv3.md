# 「難しい」レベル（lv3）執筆ブリーフ

アプリ: `~/Projects/aomatsu-web/apps/app-print-or-not`（以下 APP）。記事は3段階で表示する: 簡単（lv1・英検準2級）／普通（lv2・英検2級）／難しい（lv3・大学入学共通テスト）。今回は各記事 JSON に `levels.lv3` を追加する。

## 読むもの
- 担当記事の JSON（`APP/src/data/articles/<id>.json`）の lv1・lv2 の本文と sources
- `APP/docs/3Dfood_articles.md` の、その記事が使う資料の「使える事実」「注意」
- `APP/docs/brief-articles.md` の「英文のルール」（事実の扱い・文体・禁止表現）。slash 欄の記述は廃止済みなので無視
- `APP/src/lib/types.ts` の `Article` 型

## lv3 の英文
- 語彙・構文は**大学入学共通テスト（リーディング）レベル**（CEFR B1〜B2）。関係詞・分詞構文・譲歩（although / while）・抽象名詞（regulation, contamination, nutritional など）を自然に使ってよい。ただし難解な専門用語を並べない。
- 全体 450〜600語、5〜7段落。1文の長さ制限はない（読みやすさは保つ）。
- 内容は lv1・lv2 と同じ事実の範囲で、少し詳しく・論理のつながり（because / therefore / however / in contrast）をはっきり書く。**資料にない数値・主張・具体例を足さない**。注意欄どおり、企業の数字は *the company says*、古い報告は年つき、相関は *is linked to / may*。
- キャッチコピー・煽り・飾った導入・決め台詞で終える段落を入れない。
- ピリオド付き略語を使わない（`UK` `US` は可）。直接引用は使わない。

## JSON
- `levels.lv3.paragraphs[]` の各要素は `{ "text": "...", "hints": ["キーワード3つ（英語・カンマ区切り）", "要旨（日本語1文）", "全訳（日本語）"] }`。slash は不要。
- 記事の `hiddenNumbers` の各数（`{{hidden:0}}` など）を、lv3 本文にも**必ず1回ずつ**入れる（その数が出る箇所に `{{hidden:i}}` と書く。hints の全訳でもその数は `{{hidden:i}}` と書く）。
- 他の欄（lv1・lv2・glossary・factOpinion・sources など）は変えない。
- JSON は UTF-8・インデント2・日本語はエスケープせず保存。

## 確認
- `cd APP && npm run check:articles -- <id> <id>` で NG 0 になるまで直す。
- 担当以外のファイルは編集しない。npm install・ビルド・git・削除はしない。

## 返答
日本語200字以内: 完了した記事ID、check 結果（lv3 の語数）、判断に迷った点。本文は返さない。
