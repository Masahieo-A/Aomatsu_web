# Cloze Test & 整序メーカー — 技術仕様

## 概要

Google Spreadsheet に登録された英文データをもとに、クローズテストと整序問題を自動生成するWebアプリ。
Google Apps Script（GAS）でサーバー・フロントエンドを一体管理する。

---

## ファイル構成

```
cloze-seijo-maker/
├── index.html               ← フロントエンド（GASのHTMLテンプレートとして機能）
├── code.gs                  ← GASサーバーサイド（スプレッドシート読み込み・認証）
├── README.md                ← このファイル（技術仕様）
└── how-to-use-this-app.md  ← 利用開始手順（運用者向け）
```

---

## 使用技術

| 技術 | 用途 |
|---|---|
| Google Apps Script | サーバーサイド処理・スプレッドシート読み込み |
| HTML / CSS / Vanilla JS | フロントエンドUI |
| LINE Messaging API | 学習進捗通知（オプション） |
| Google Spreadsheet | 問題データのデータソース |

---

## スプレッドシート構成

### シート①：`ClozeTest`（クローズテスト問題）

| 列 | 内容 | 例 |
|---|---|---|
| A (ID) | 問題ID | `1` |
| B (LESSON) | レッスン番号 | `Lesson 1` |
| C (PART) | パート | `Part A` |
| D (TITLE) | タイトル | `Unit 1` |
| E (ORDER) | 表示順 | `1` |
| F (BODY) | 英文本体（穴埋め箇所は `___` で表記） | `I ___ a student.` |
| G (TRANS) | 日本語訳 | `私は学生です。` |

### シート②：`SentenceRearrangement`（整序問題）

| 列 | 内容 | 例 |
|---|---|---|
| A (ID) | 問題ID | `1` |
| B (LESSON) | レッスン番号 | `Lesson 1` |
| C (PART) | パート | `Part A` |
| D (TITLE) | タイトル | `Unit 1` |
| E (SEQ) | 文内の順序 | `1` |
| F (SENTENCE) | 英文（単語は半角スペース区切り） | `I am a student .` |
| G (TRANS) | 日本語訳 | `私は学生です。` |

### シート③：`ErrorLog`（エラーログ）

GASが自動書き込みするシート。手動編集不要。

---

## GAS の主要関数

| 関数名 | 役割 |
|---|---|
| `doGet(e)` | Webアプリアクセス時のエントリーポイント |
| `checkPassword(inputPassword)` | パスワード認証 |
| `getClozeData(lesson, part)` | クローズ問題データ取得 |
| `getOrderData(lesson, part)` | 整序問題データ取得 |

---

## 設定値（`code.gs` 上部）

| 定数名 | 内容 |
|---|---|
| `SPREADSHEET_ID` | データソースのスプレッドシートID |
| `APP_PASSWORD` | アプリログインパスワード |
| `CHANNEL_ACCESS_TOKEN` | LINE Messaging API トークン（任意） |
| `USER_ID` | LINE 通知先ユーザーID（任意） |

---

## デプロイ方法

Google Apps Script エディタ から「デプロイ」→「新しいデプロイ」→「ウェブアプリ」を選択。
詳細は `how-to-use-this-app.md` を参照。

---

## 既知の制限事項

- GAS の無料枠には1日あたりの実行時間制限あり（6分/実行・90分/日）
- スプレッドシートが「共有なし」の場合、GASがデータを読み取れない
- LINE通知はオプション。`CHANNEL_ACCESS_TOKEN` を空のままにすると通知は送られない
