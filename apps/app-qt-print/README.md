# APP019 Question Time 印刷（app-qt-print）

生徒のessayごとの追随質問（Question Time）を、**A4縦1枚**の解答用紙・採点シート・返却シートにして印刷する教員用ツール。
静的HTML（ポータルと同じデプロイ）。**ファイルはブラウザ内だけで処理し、通信・ログイン・DB・AI APIは使わない。**

- 公開パス: `/apps/app-qt-print/index.html`（教員用ページ `admin/index.html` にカード掲載）
- 旧Webアプリ版（`~/Projects/question-time`）は API 課金のため運用を止め、この「サブスクの Gem ＋ 紙」方式に切り替えた（2026-09-23）。

## 設計思想（元の Question Time 要件定義 v1.1 から引き継いだもの）

- **分散認知を認める**: essayを書く段階で AI・辞書・友人を使ったかは問わない。問うのは、その論理を道具なしで説明・防御・応用・言い換えできるか（＝自分のものにしているか）。
- **essayは外部記憶として見てよい**: 解答用紙に essay 全文を印字し、質問が取り上げた箇所に下線と問番号を付ける。記憶ではなく論理の所有を見る。
- **紙・授業内・辞書/AIなし**で解答させる（§1.3「汚染されていない唯一の言語産出サンプル」）。
- **質問＝アンカー（一字一句の引用）× 操作 × 整合性**。構成は Q1 反論防御 → Q2 論理転移 → Q3 平易化で固定。
- **文法は指示しない**（task-essentialness）。生徒用紙に目標文法は出さない。
- **二軸評価**: Content（essayの理由との接続）と Language（固定ルーブリック）を別採点。ルーブリックの骨格はアプリ側で固定し、Gemは「論点」などの空欄だけを埋める（P1）。採点シートだけで採点できる（P5）。
- **学習ループ**: 返却シートで A 基準・解答例・使える表現を示し、次の essay の Step 4（想定問答）につなげる。

## 運用の流れ

1. Googleフォーム（クラス／番号／氏名／essay）で、紙に書いた essay を生徒が入力 → 回答スプレッドシート
2. スプレッドシートに空の「質問」シートを追加
3. アプリで .xlsx を読み込み →「課題開始メッセージ」と 5人ずつのバッチ（**ID＋本文のみ、氏名なし**）をコピーして Gem に渡す
4. Gem の出力（TSV・見出しつき）を「質問」シートに貼る → .xlsx を再ダウンロードして読み込む
5. 点検（引用が essay に一字一句あるか、語数など）→ 解答用紙／採点シート／返却シートを印刷

## ファイル

| ファイル | 役割 |
|---|---|
| `index.html` / `style.css` / `app.js` | 画面・A4レイアウト・読み込み／点検／描画 |
| `docs/system-prompt.md` | **Gem（またはマイGPT）のシステムプロンプトの正本**（8,000字以内） |
| `prompt.js` | 上記から自動生成（画面の「コピー」ボタン用）。md を直したら下のコマンドで再生成 |
| `xlsx.full.min.js` | SheetJS（`app-parent-teacher-meeting` と同じものを同梱） |
| `docs/sample/サンプル_QuestionTime.xlsx` | 架空の生徒4人のサンプル（画面の「サンプルで試す」） |

```bash
# docs/system-prompt.md を編集したら prompt.js を再生成
cd apps/app-qt-print && python3 -c "import json;open('prompt.js','w').write('// 自動生成: docs/system-prompt.md から作成（編集は md 側で行い、README の手順で再生成）\nwindow.QT_SYSTEM_PROMPT = '+json.dumps(open('docs/system-prompt.md').read(),ensure_ascii=False)+';\n')"
```

## スプレッドシートの仕様

- **essay（フォーム回答）**: 見出しに「クラス」「番号」「氏名」「essay」を含む列（表記ゆれ: 組／出席番号／名前／エッセイ・英作文・本文も可）。ID は `クラス-番号2桁`（例 `2A-01`。数字だけのクラスは `1組-05`）。同じIDの重複提出は最後の行を採用。
- **質問（Gem出力）**: 見出し `ID 主張 理由` ＋ `Q1_引用 Q1_質問 Q1_和訳 Q1_意図 Q1_論点 Q1_A例 Q1_B例 Q1_等価構造` × Q1〜Q3（計27列。和訳がない旧形式も読める）。見出し行が途中で繰り返されても可。主張が `【要確認】` で始まる行は異常 essay（予備問題で印刷可）。

## 動作確認

```bash
cd ~/Projects/aomatsu-web && python3 -m http.server 8765
# http://127.0.0.1:8765/apps/app-qt-print/index.html?sample=1   （&kind=teacher / feedback）
```

印刷は Chrome で「A4・余白なし・倍率100・背景のグラフィック オン」。
