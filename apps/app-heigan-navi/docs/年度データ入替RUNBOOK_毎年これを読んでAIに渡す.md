# 年度データ入替 RUNBOOK（毎年これを読んでAIに渡す）

> **これは何**: 併願照合アプリ（HeiganNavi）の入試データを翌年度版に入れ替えるための運用覚書。
> 2026-07-06〜07 に13大学・798件を構築したときに**実際に踏んだ地雷**と、その回避策をすべて記録してある。
> **使い方**: 来年度の入替時、このファイル全体をClaude（Claude Code / Cowork）に読ませて「この手順で今年度版に入れ替えて」と指示する。人間はこのファイルの「人間がやること」だけやればよい。

---

## 0. 全体像（5フェーズ）

```
[P1] 収集   大学公式サイト → PDF取得 → pdf_to_txt.py でtxt化 → manifest.csv 追記
[P2] 抽出   txt → ExamMethod JSON（大学ごとに並列エージェント、逐語quote必須）
[P3] 検証   verify_quotes.py（原文一致）＋スキーマ検証＋heiganPolicy矛盾チェック
[P4] 修復   検証落ちレコードを原文と突き合わせて修正（ループ上限3回、残りはflagged）
[P5] 反映   data/exam-methods.json + source-links.json 差し替え → build → push → Vercel自動デプロイ → 本番バンドル確認
```

**鉄則: 生成ではなく照合。** 全数値・日付・科目に evidence（逐語quote＋ページ番号）を付け、
機械検証を通らないものは `reviewStatus: "flagged"` にしてアプリに出さない（アプリは confirmed のみ読む）。

### 関連ファイルの場所

| 何 | どこ |
|---|---|
| 要件定義書（スキーマの正） | `~/Projects/aomatsu-web/apps/app-heigan-navi/大学search/併願照合アプリ_要件定義.md` §4 |
| 元データ置き場 | `~/Projects/aomatsu-web/apps/app-heigan-navi/大学search/juken/juken-data/{大学名}/{2027 or 2026_実績}/` |
| manifest（取得元URL台帳） | `juken-data/manifest.csv`（列: 大学名,年度,方式区分,ファイルパス,取得元URL,取得日,公開状況メモ） |
| PDF→txt変換 | `~/Projects/aomatsu-web/apps/app-heigan-navi/大学search/juken/pdf_to_txt.py`（pdfplumber、`=== PAGE N ===`区切り） |
| 原文一致検証 | `~/Projects/aomatsu-web/apps/app-heigan-navi/大学search/juken/verify_quotes.py`（NFKC＋空白除去後の部分一致、exit 0/1） |
| アプリのデータ | `~/Projects/heigan-navi/data/exam-methods.json` と `data/source-links.json` |
| アプリ | GitHub `Masahieo-A/heigan_search` → Vercel `heigan-search.vercel.app`（push で自動デプロイ） |

### 対象13大学（2026年度時点）

南山 / 中京 / 名城 / 愛知 / 愛知学院 / 愛知淑徳 / 金城学院 / 愛知東邦 / 至学館 / 名古屋学芸 / 名古屋外国語 / 修文 / 名古屋学院
（「東邦」は**愛知東邦大学**。千葉の東邦大学ではない。毎回間違えかける）

---

## 1. 想定エラー一覧（全部実際に起きた）と対策

### P1 収集フェーズ

| # | エラー | 実例 | 対策 |
|---|---|---|---|
| E1 | 2027年度版が未公開（一般選抜・共テ利用は秋公開が通例） | 名城・愛知・名古屋外語・名古屋学芸ほか多数 | 前年度版で `dataStatus: "carryover_2026"` として収録し、**秋に再収集して差し替える**（§4参照）。manifest に「9月上旬公開予定」等のメモを残す |
| E2 | 前年度版PDFが公式サイトから削除済み | 南山ippan、名古屋学院（全方式） | **Wayback Machine（web.archive.org）のCDX APIでスナップショットを探す**。名古屋学院はこれで67ページの要項を回収できた |
| E3 | PDFのURLが年度非依存の固定パス | 愛知東邦 `学生募集要項.pdf` | **表紙の年度表記を必ず検品**（Last-Modifiedも確認）。ファイル名だけで年度を信じない |
| E4 | PDFがベクター画像テーブルで文字が抽出できない | 愛知淑徳の ippan/kobo/kyotsu（txtが十数行しかない） | txt化直後に `wc -l` と目視でサニティチェック。**空なら捏造せず「未収録」として記録**。HTMLページ側に情報がある場合は将来の課題としてメモ |
| E5 | PDFがCIDエンコードで文字化け | 愛知大 kobo（本文ほぼ全部が化けていた） | 判読できる部分だけ使い、化けた箇所は**推測せずスキップ**。manifest のメモに「CID化け」と書く |
| E6 | 同名・類似名の別大学を取ってくる | 「東邦」問題 | プロンプトに**正式名・所在地・公式ドメインを明記**（例: 愛知東邦大学 aichi-toho.ac.jp）。第三者まとめサイトからのDL禁止も明記 |

### P2 抽出フェーズ

| # | エラー | 実例 | 対策 |
|---|---|---|---|
| E7 | エージェントがセッション上限で死に、**出力ファイルが空/ゼロ件** | 初回の8大学抽出で4エージェントが全滅（金城は1件だけ書いて死んだ） | プロンプトに必ず書く: **「部分的でもいいから出力ファイルを早めに書き、その後上書きで拡充せよ」「小刻みなReadではなく大きめのチャンクで読め」「網羅より完走を優先」** |
| E8 | エージェントが孫エージェントを勝手に生成して混乱（存在しない宛先にSendMessageし続けるループ） | 初回サンプル抽出時に発生 | プロンプトに必ず書く: **「Do NOT spawn sub-agents. Do NOT use SendMessage. Work alone, files only.」** |
| E9 | quoteが「きれいに直された」パラフレーズになり原文一致に落ちる | 中京・金城で大量発生（多段組OCRの列崩れテキストを整形してしまう） | プロンプトに必ず書く: **「列崩れOCRテキストは崩れたまま逐語で引用せよ。整形・並べ替え・清書したquoteは検証に落ちる」** |
| E10 | **heiganPolicy の意味反転**（引用文が「専願ではありません」なのに sengan を設定） | 南山で実際に発生 | プロンプトに意味規則を明記（「専願ではない/併願可→heigan_ok、専願/入学を条件→sengan、記載なし→unknown＋evidence作らない」）＋P3でヒューリスティック矛盾チェック（§2のスクリプト） |
| E11 | **隣の列の値を拾う**（多段組PDFで別方式の日付・型名を誤採用） | 中京国際思考型の試験日（隣列の10/17を採用、正しくは11/1）、愛知学院の事前体験型/事前課題型の取り違え4件 | 機械検証では捕捉不可。修復パスで該当節を精読させると見つかる。**「値がquoteと本当に対応しているか、前後の見出し・表の行を確認せよ」**と指示。最終的には教員レビューが砦 |
| E12 | 科目コードを `{subject:"英語"}` でなく生文字列 `"英語"` で出す | 名古屋学院157件中66件 | P3のスキーマ検証で捕捉できる（§2）。機械修正も容易（str→{subject:str}）。**スキーマ検証を必ず統合前に回す** |
| E13 | choiceGroups の pick 数や必須/選択の区分ミス | 金城共テ前期 pick1→正2、名城農学部「化学必須」→正しくは理科3択 | 「満点＝各科目配点の合計」と整合するか突き合わせるのが有効。修復パスの精読で発見された |
| E14 | 検定料テーブルが崩れて方式との対応が取れない | 名古屋学院（2つの表が混ざった） | **無理に埋めずnull**にし、READMEに「意図的null」と明記。誤った金額を出すより欠損の方が安全 |
| E15 | 指定校推薦など「そもそも公表されない」情報 | 修文の指定校5件（日程は高校ごと個別調整） | 捏造せず null＋flagged。これは**エラーではなく仕様**なのでREADMEに書いて毎年混乱しないようにする |

### P3〜P5 検証・統合・デプロイフェーズ

| # | エラー | 実例 | 対策 |
|---|---|---|---|
| E16 | エージェントの「全部OK」自己申告が信用できない | 常に | **親側で必ず再検証**（verify_quotes.py＋スキーマ＋heiganPolicy矛盾チェックの3点セット、§2）。エージェントの報告は参考情報 |
| E17 | 統合時のID重複 | 旧サンプルと全件版で3件重複しかけた | 統合スクリプトで `len(ids) == len(set(ids))` を必ずassert |
| E18 | evidence の pdfFile が manifest に無い＝根拠リンクが解決できない | — | 統合時に「confirmed全件のpdfFile ⊂ manifest のファイルパス」をチェック（§2）。source-links.json は manifest から機械生成する |
| E19 | PDF実体をリポジトリ/デプロイに含めてしまう（再配布NG） | 初期に public/juken-data のsymlinkをcommitしかけた | **PDF実体は .gitignore 済み**（`public/juken-data`）。根拠リンクは大学公式URL（source-links.json経由）に向ける設計。この設計を壊さない |
| E20 | デプロイされたか確信が持てない（トップHTMLはデフォルト大学分しか含まない） | — | 本番確認は `<option>` タグの大学一覧＋**JSバンドル内のマーカー文字列**（今回追加した特徴的なquoteなど）をgrepする（§3手順P5） |

---

## 2. 検証3点セット（毎回、統合前に親セッションで実行）

```bash
cd ~/Projects/aomatsu-web/apps/app-heigan-navi/大学search/juken

# ① 原文一致検証（全evidence.quoteがソースtxtに部分一致するか）
python3 verify_quotes.py <統合JSON>   # "0 quote failures" になるまで

# ② スキーマ検証＋heiganPolicy矛盾チェック（下のスクリプトを流用）
python3 - << 'EOF'
import json, re
from collections import Counter
d = json.load(open('<統合JSON>'))
required_keys = {"id","university","faculty","department","methodName","methodCategory","heiganPolicy","subjects","schedule","fee","feeNote","dataYear","dataStatus","evidence","reviewStatus","reviewedBy","reviewedAt"}
valid = dict(cat={"shiteiko","kobo","sogo","ippan","kyotsu"}, policy={"sengan","heigan_ok","unknown"},
             status={"confirmed_2027","carryover_2026"},  # ★年度更新時はここを新年度に書き換える
             review={"auto","flagged","confirmed"},
             subj={"英語","国語","数学","日本史","世界史","地理","公民","物理","化学","生物","情報"})
problems=[]; ids=[r['id'] for r in d]
if len(ids)!=len(set(ids)): problems.append(('DUP-ID',[i for i in set(ids) if ids.count(i)>1]))
for r in d:
    if required_keys-set(r): problems.append((r['id'],'missing',required_keys-set(r)))
    if r['methodCategory'] not in valid['cat'] or r['heiganPolicy'] not in valid['policy'] \
       or r['dataStatus'] not in valid['status'] or r['reviewStatus'] not in valid['review']:
        problems.append((r['id'],'enum'))
    if r['subjects']:
        for c in r['subjects'].get('required',[])+[x for g in r['subjects'].get('choiceGroups',[]) for x in g['from']]:
            if not isinstance(c,dict) or c.get('subject') not in valid['subj']: problems.append((r['id'],'subject',c))  # ← E12を捕まえる
    for e in r['evidence']:
        if not e['pdfFile'].endswith('.pdf'): problems.append((r['id'],'pdfFile',e['pdfFile']))
print(len(problems),'schema problems'); [print(p) for p in problems[:30]]
# heiganPolicy意味矛盾（E10を捕まえる）
sus=[]
for r in d:
    ev=next((e for e in r['evidence'] if e['field']=='heiganPolicy'),None)
    if not ev: continue
    q=ev['quote']; neg=bool(re.search(r'専願.{0,10}(ではな|でない|ではありません)',q))
    ok=any(w in q for w in['併願可','併願することができ','併願できます','併願が可能','併願も可能','併願は可能'])or neg
    sen=('専願'in q)and not neg and'併願'not in q
    if (r['heiganPolicy']=='sengan'and ok)or(r['heiganPolicy']=='heigan_ok'and sen): sus.append((r['id'],r['heiganPolicy'],q[:60]))
print(len(sus),'heiganPolicy suspects'); [print(s) for s in sus]
print(Counter(r['reviewStatus'] for r in d))
EOF

# ③ manifest整合＋source-links.json再生成
python3 - << 'EOF'
import csv, json
rows=list(csv.DictReader(open('juken-data/manifest.csv')))
links={r['ファイルパス'].strip():{"url":r['取得元URL'].strip(),"note":r['公開状況メモ'].strip()}
       for r in rows if r['ファイルパス'].strip() and r['取得元URL'].strip()}
d=json.load(open('<統合JSON>'))
used={e['pdfFile'] for r in d if r['reviewStatus']=='confirmed' for e in r['evidence']}
missing=sorted(p for p in used if p not in links)
print('missing from manifest:',missing)  # ← 空であること
json.dump(links,open('source_links.json','w'),ensure_ascii=False,indent=2)
EOF
```

---

## 3. 年度入替の実行手順（AIへの指示テンプレ込み）

### 人間がやること（これだけ）
1. 秋（9月〜11月、各大学の公開時期はmanifestのメモ参照）にこのファイルをAIに読ませ「2028年度版への入替を開始して」と言う
2. flagged が残ったら中身を見て、直すか諦めるか判断する
3. **完成データを面談で使う前に、教員として原本と突き合わせてレビューする**（特に日付と専願/併願。E11系の「隣の列」ミスは機械では捕まらない）

### AIがやること

**P1 収集**（大学ごとに並列バックグラウンドエージェント。1エージェント=1大学）
- プロンプト必須要素: 大学の正式名＋公式ドメイン / manifest.csvの該当行（前年の取得元URLから探し始める）/ フォルダ・ファイル命名規約（`{方式}_{説明}_{YYYYMMDD}.pdf`）/ pdf_to_txt.py でtxt化 / txtのサニティチェック（E4）/ manifest追記は**append-only**（他大学の行を触らない）/ 収集レポートmd作成 / **sub-agent禁止・SendMessage禁止**
- 前年度フォルダは消さない。新年度は `juken-data/{大学}/2028/` を新設。前年分は `2027_実績` 扱いに読み替え

**P2 抽出**（同じく1エージェント=1大学、並列）
- プロンプト必須要素（今回の完成版プロンプトの要点）:
  - 要件定義§4のスキーマ厳守、SubjectCodeは必ず `{subject:"…"}` オブジェクト（E12）
  - **全数値・日付・科目に evidence（逐語quote、pdfFileは.pdf拡張子、pageは `=== PAGE N ===` 起点）**
  - **崩れたOCRは崩れたまま引用**（E9）
  - heiganPolicy の意味規則明記（E10）。記載なしは unknown＋evidenceなし
  - dataStatus: 新年度確定なら `confirmed_2028`、前年流用なら `carryover_2027`（アプリ側 lib/types.ts の型も同時に更新すること）
  - **出力ファイルを早めに書け・完走優先**（E7）
  - **自己検証ループ**: verify_quotes.py を自分で回して修正、**上限3回**、残りはflaggedで報告（ユーザー指示の定番: ループ3回で一時終了・報告）
  - sub-agent禁止・SendMessage禁止（E8）
- 出力: `full_extract_{大学ローマ字}.json`

**P3 検証** → §2の3点セットを親セッションで実行（エージェント報告は信用しない: E16）

**P4 修復**（検証落ちがあれば、大学ごとにグルーピングして修復エージェント）
- 入力: flagged レコードだけ切り出した `repair_input_*.json`
- 指示: 該当ページ±1を読み直し正しい逐語quoteに差し替え / **値そのものも再確認**（E11・E13が見つかるのはここ）/ 直せないものはflaggedのまま / ループ上限3回

**P5 反映**
```bash
cp 統合JSON ~/Projects/heigan-navi/data/exam-methods.json
cp source_links.json ~/Projects/heigan-navi/data/source-links.json
cd ~/Projects/heigan-navi && npx tsc --noEmit && npm run build   # 通ること
# data/SAMPLE_DATA_README.md のカバレッジ表・件数・年度を更新
git add -A && git commit && git push   # SSHのみ。トークン共有しない（本人の方針）
# デプロイ確認: curl本番HTML → <option>の大学一覧 / JSバンドルをgrepして新データのマーカー文字列を確認（E20）
```

---

## 4. 年度入替特有の注意（carryover の差し替え）

- 今のデータには `carryover_2026`（前年度実績で代替した分）が大量にある。**2027年度版が秋に公開されたら該当大学だけ再収集→再抽出→差し替え**る。全部やり直す必要はない（大学単位で `full_extract_*.json` を作り直して統合し直せばよい）
- アプリの日程照合は `carryover` だと**±3日の黄色帯**で表示される設計。確定版に差し替わると赤/正確判定に変わる。**差し替え忘れ＝ずっと「要確認」表示**なので、manifestの「公開予定」メモを見て秋に回収すること
- 型定義（`lib/types.ts` の `DataStatus`, `dataYear`）は年度リテラルを含む。新年度では `"confirmed_2028" | "carryover_2027"` 等に更新し、検証スクリプト（§2の★印）も同期させる

## 5. 今回の成果物マップ（参照用）

```
~/Projects/aomatsu-web/apps/app-heigan-navi/大学search/juken/
  pdf_to_txt.py                  # PDF→txt変換（pdfplumber）
  verify_quotes.py               # 原文一致検証（これが品質の心臓部）
  full_extract_{大学}.json       # 大学別抽出結果（13ファイル）
  full_extract_all15.json        # 統合済み798件（2026-07-07版の最終形）
  repair_input/output_*.json     # flagged修復の入出力（作業ログとして残置）
  juken-data/manifest.csv        # 取得元URL台帳（source-links.jsonの生成元）
  juken-data/収集レポート_*.md   # 大学別の収集経緯（来年の探索の起点になる）
```

**最後に一番大事なこと**: このパイプラインの品質保証は「逐語quote＋機械検証＋flagged隔離」の三段構え。
どんなに急いでいても **quoteなしの値・検証を通っていないデータをconfirmedにしない** こと。
それさえ守れば、間違いは「表示されない」だけで済み、生徒への進路事故にはならない。
