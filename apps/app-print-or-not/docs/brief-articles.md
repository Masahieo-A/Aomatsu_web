# 記事執筆ブリーフ（記事担当サブエージェント共通）

アプリ: `~/Projects/aomatsu-web/apps/app-print-or-not`（以下 APP）。高校3年生（英検準2級）向けの読解サイト。

## 読むもの
- `APP/docs/3Dfood_articles.md` … 担当ページの「A. ページ構成」の行と、そのページが使う資料（A1〜A14 / B1〜B13）の「使える事実」と「注意」
- `APP/docs/3Dfood_site_requirements.md` の §3 S3 Reader、§4.1、§5 著作権
- `APP/docs/3Dfood_writing_materials.md` の §7（強そうで弱い根拠）
- `APP/src/lib/types.ts` の `Article` 型（JSON はこの型に厳密に従う）
- `APP/src/data/points.json`（Point の ID 一覧）

## 書くもの
`APP/src/data/articles/<id>.json`（仮置きを上書き）。id の対応: P1=pro-01, P2=pro-02, P3=pro-03, P4=pro-04, C1=con-01, C2=con-02, C3=con-03, C4=con-04。

## 英文のルール
- **Lv1**: 英検準2級レベル（CEFR A2〜B1）。中学〜高1の基本語中心。専門語は避け、必要なものだけ glossary に入れる。1文15語以内、全体200〜300語、4〜5段落。関係代名詞の多重入れ子・分詞構文・仮定法は使わない。
- **Lv2**: 英検2級程度。350〜450語、4〜6段落。Lv1 と同じ事実を、少し詳しく・少し長い文で。
- 内容は資料の「使える事実」だけ。**資料にない数値・主張を足さない**。迷ったら資料に戻る。
- 「注意」欄に従って言い方を調整する：企業の数字は *the company says*、古い報告は年を書く（*In 2023, ...* / *there were*）、相関は *may* / *is linked to*、研究段階のものは *still being studied* など。培養肉と3Dプリントを混同しない。
- 元記事の翻訳にしない。複数資料から事実を拾って一から書く。直接引用は原則使わない（使っても1か所・15語未満）。
- 文体は平易な説明文。**キャッチコピー・煽り・飾った導入を入れない**（例: *Imagine a world where...* / *game-changer* / *revolutionize* / *In today's world* / *Let's explore* / ダッシュ「—」の多用 / 感嘆符）。最後の段落も「まとめの決め台詞」にせず、事実か、残っている課題で終える。
- 賛成側の記事でも、資料に書かれた限界（価格・研究段階など）を1文入れてよい。反対側の記事も感情的にしない。
- ピリオド付き略語を使わない（`UK` `US` `Dr` は可だが `U.K.` `Dr.` は不可）。数字は `125,000 dollars` `about half` のように読める形で。
- 日本語資料の事実も英語で書く。円・トンなどの単位は英語表記（`770,000 yen`, `4.6 million tons`）。

## JSON の各欄
- `hookTitle`: 3Dfood_articles.md の表の見出しをそのまま。
- `point`: 記事の主な論点（points.json の ID）。`cardPoints`: Evidence Card で選ばせる Point を2〜4個（主に記事の側のもの。反対側の材料にもなる事実があればそちらの ID を1つ入れてよい）。
- `difficulty`: 1〜3（★の数、Lv1 の読みやすさ基準）。`minutes`: Lv1 を読む目安分数。
- `sources`: 使った資料を**すべて**。`title` は資料名の原文（日本語資料は日本語のまま）、`publisher`、`date`（YYYY-MM-DD。日が分からなければ YYYY-MM、年だけなら YYYY）、`url`（資料の URL をそのまま）、`lang`、`authorType`（university / government / company / media / journal）、`biasNote`（日本語1行。「その立場ゆえの偏りの可能性」。企業発表なら宣伝の可能性に触れる。報道・業界誌なら企業側の説明中心である点など、資料の注意欄を使う）。
- `levels.lv1.paragraphs[]` と `levels.lv2.paragraphs[]`:
  - `text`: 本文。
  - `slash`: 同じ本文に、意味のかたまりごとに ` / ` を入れたもの（` / ` を取り除くと text と完全一致すること）。
  - `hints`: `[キーワード3つ（英語, カンマ区切り）, 要旨（日本語1文）, 全訳（日本語）]`。
- `glossary`: 8〜12語。Lv1 本文に実際に出る語。`forms` に本文中の変化形（`swallowing` など）。`easyEn` は易しい英語の説明（10語前後）、`ja` は日本語訳。
- `hiddenNumbers`: 1〜2個。記事の中で一番「えっ」となる数値。本文では該当箇所を `{{hidden:0}}` と書き、`display` に実際の表記（例 `about half`）。`answer` は数値、`unit`、`label`（英語で何の数か）、`choices`（answer を含む4択、昇順）。`paragraph` は Lv1 での段落インデックス（0始まり）。**Lv1 と Lv2 の両方の本文に同じ `{{hidden:i}}` を入れる**。slash と hints（全訳など）にも、その数が出る箇所は `{{hidden:i}}` を使う。
- `factOpinion`: 3文。Lv1 本文中の文を**一字一句そのまま**。少なくとも1つは opinion（誰かの判断・予想・評価の文。例: *This may become a normal way to cook in the future.*）。`explain` は日本語1文で理由。

## 担当別の必須事項
- pro-02 には「寿司1個の印刷に6〜7分」を必ず入れる（Hook の True/False で使う）。
- pro-04 には「NASA が試作機に125,000ドル（2013年）」を必ず入れる。
- con-04 には「イタリアが2023年11月に培養肉の製造・販売を禁止」を必ず入れる。

## 確認
- `cd APP && npm run check:articles -- <id> <id>` を実行し、**NG が0になるまで直す**。△（警告）は内容を見て判断。
- 自分の担当以外のファイルは編集しない。npm install・ビルド・git 操作・削除はしない。

## 返答
200字以内: 完了した記事ID、check 結果、資料と照らして判断に迷った点（あれば）。本文の全文は返さない。
