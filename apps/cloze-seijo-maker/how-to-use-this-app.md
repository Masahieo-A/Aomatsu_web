# Cloze Test & 整序メーカー — 利用開始手順

## 概要

Google Spreadsheet に登録した英文データから、クローズテストと整序問題を自動生成するアプリです。
Google Apps Script（GAS）で動作するため、Vercel等のサーバーは不要です。

---

## 必要なもの

| 項目 | 備考 |
|---|---|
| Google アカウント | スプレッドシート・GASの実行に必要 |
| Google Spreadsheet | 問題データの入力先（テンプレあり） |
| LINE アカウント（任意） | 学習進捗の通知を受け取る場合のみ |

---

## セットアップ手順

### 1. スプレッドシートを準備する

1. 既存のスプレッドシートを使う場合：  
   スプレッドシートID（`1O2MidGKM4GOxU-...` の形式）を確認  
   → URLの `/d/` と `/edit` の間の文字列がID

2. 新規作成の場合：  
   - Google Drive で新しいスプレッドシートを作成  
   - シートを3枚用意し、名前をそれぞれ `ClozeTest`・`SentenceRearrangement`・`ErrorLog` に変更  
   - `ClozeTest` シートの1行目にヘッダーを追加：`ID / LESSON / PART / TITLE / ORDER / BODY / TRANS`  
   - `SentenceRearrangement` シートの1行目：`ID / LESSON / PART / TITLE / SEQ / SENTENCE / TRANS`  
   - 各列の詳細は `README.md` を参照

3. スプレッドシートの共有設定を変更：  
   右上「共有」→「リンクを知っている全員」→「閲覧者」に変更

### 2. GAS プロジェクトを作成・設定する

1. [Google Apps Script](https://script.google.com/) を開く
2. 「新しいプロジェクト」を作成
3. `code.gs` の内容を貼り付ける
4. `index.html` ファイルを作成し、`index.html` の内容を貼り付ける
5. `code.gs` の先頭にある以下の定数を書き換える：

```javascript
const SPREADSHEET_ID = '【スプレッドシートIDをここに貼り付け】';
const APP_PASSWORD   = '【任意のパスワード】';
```

### 3. LINE 通知を設定する（任意）

通知不要な場合はこの手順をスキップしてください。

**LINE Messaging API トークンの取得：**
1. [LINE Developers](https://developers.line.biz/) にログイン
2. プロバイダー → チャネル（Messaging API）→「チャネルアクセストークン」を発行
3. 自分のLINE UserIDを確認（[こちらのツール](https://lineapiusecase.com/ja/api/getchatid.html) 等で取得）

**`code.gs` に入力：**
```javascript
const CHANNEL_ACCESS_TOKEN = '【取得したトークン】';
const USER_ID              = '【自分のLINE UserID】';
```

### 4. GAS をデプロイする（Webアプリとして公開）

1. GASエディタ右上「デプロイ」→「新しいデプロイ」をクリック
2. 種類：「ウェブアプリ」を選択
3. 設定：
   - 説明：任意（例：`Cloze & 整序メーカー v1`）
   - 次のユーザーとして実行：**自分**
   - アクセスできるユーザー：**全員**（またはGoogleアカウント所持者）
4. 「デプロイ」→「アクセスを承認」→ Googleアカウントで認証
5. 表示された **ウェブアプリのURL**（`https://script.google.com/macros/s/.../exec`）をコピー

### 5. ポータルのカードURLを更新する

1. ポータルのリポジトリ（`Aomatsu_web`）の `index.html` を開く
2. Cloze test のカードの `href="#"` を手順4で取得したURLに変更：

```html
<a href="https://script.google.com/macros/s/【YOUR_SCRIPT_ID】/exec" ...>
```

3. GitHub にpush → Vercelが自動デプロイ

---

## 動作確認

1. デプロイURLにアクセス
2. パスワード（`code.gs` の `APP_PASSWORD`）を入力してログイン
3. レッスン・パートを選択して問題が表示されれば正常動作

---

## よくあるエラーと対処法

| エラー・症状 | 原因 | 対処 |
|---|---|---|
| 問題が表示されない | スプレッドシートIDが間違い / 共有設定が非公開 | IDを再確認・共有設定を「リンクを知っている全員」に変更 |
| 「承認が必要」と表示される | GASの実行権限が未承認 | デプロイ時に「アクセスを承認」を実行 |
| LINE通知が届かない | トークンまたはUserIDが間違い | LINE Developersで再確認 |
| デプロイ後に変更が反映されない | 再デプロイが必要 | GASエディタで「デプロイ」→「デプロイを管理」→「編集（鉛筆アイコン）」→「バージョン：新しいバージョン」→「デプロイ」 |

---

## データ入力のヒント

- 英文の穴埋め箇所は `___`（アンダースコア3つ）で表記します
- 整序問題の英文は単語ごとに半角スペースで区切ります（ピリオドも独立させる）  
  例：`I am a student .`
- `LESSON` 列は統一したフォーマット（例：`Lesson 1`）で入力すると絞り込みが正確になります
