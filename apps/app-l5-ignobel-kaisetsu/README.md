# APP020 — L5 Ig Nobel Prize 本文解説

- 英語コミュニケーション Lesson 5「Ig Nobel Prize」の本文解説（テスト勉強用）。Part 1〜3 の本文・1文ごとの和訳・読解ポイント。
- 指示語ともとの名詞を同じ色・形・記号で表示。後置修飾（現在分詞・関係詞・to不定詞）は「名詞に赤線／説明を〈 〉／↩説明」で表示（前置詞句の後置修飾は扱わない）。
- 「注釈をかくす」「和訳をぼかす」で自己チェックできる。
- **ポータル・教員用ページにはカードを掲載しない独立ページ**（URL を直接配布）。検索よけに `noindex` を付けている。

## 構成
- `index.html` … 本体（CSS は埋め込み）
- `app.js` … 表示切り替えボタン（ポータルの CSP で埋め込み script が禁止のため別ファイル）

## 更新方法
正本の生成スクリプトは `~/School/教材/L5_解説/_build/build_L5解説.py`。
このフォルダのファイルは直接編集せず、スクリプトを直して次を実行する。

```bash
python3 ~/School/教材/L5_解説/_build/build_L5解説.py --publish
```

## URL
https://aomatsu-english-portal.vercel.app/apps/app-l5-ignobel-kaisetsu/index.html
