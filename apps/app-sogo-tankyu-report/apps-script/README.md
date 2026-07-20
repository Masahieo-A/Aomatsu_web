# Apps Script セットアップガイド

このフォルダのコードを Google スプレッドシートに貼り付けることで、
**Classroom 提出 → PDF変換 → サイト反映** を自動化できます。

> 画面つきの詳しい手順は、リポジトリ直下の **`admin-guide.html`**（管理者向けガイド）を参照してください。
> 毎年の運用手順（教員向け）は **`teacher-guide.html`**（実務編）にあります。

---

## ファイル構成

| ファイル | 役割 |
|----------|------|
| `config.gs` | 列番号・シート名・設定キーの定数 |
| `main.gs` | メニュー定義・処理の司令塔・トークン設定 |
| `classroom.gs` | Google Classroom API から提出物を取得 |
| `drive.gs` | Drive のファイル整理・PDF変換 |
| `sheets.gs` | スプレッドシートの読み書き・JSON生成 |
| `github.gs` | GitHub API で schedule.json を更新 |
| `template.gs` | 探究レポート用 Slides テンプレートを自動生成 |

---

## セットアップ手順

### 1. Google スプレッドシートを作成

任意の名前で新しいスプレッドシートを作成してください（共有ドライブに置くと引き継ぎが楽です）。

### 2. Apps Script エディタを開く

スプレッドシートのメニューから
**「拡張機能」→「Apps Script」** を選択。

### 3. コードを貼り付ける

左のファイル一覧に `+` ボタンでファイルを追加し、
このフォルダの `.gs` ファイルの内容をそれぞれコピー＆ペーストしてください。

> **順番は問いません。** ファイル名は `.gs` を除いた名前（例: `config`）にしてください。

### 4. 必要なサービスを有効化

Apps Script エディタの左メニュー「サービス」(＋) から以下を追加：

- **Google Classroom API**（Classroom v1）
- **Google Drive API**（Drive v3）
- **Google Slides API**（Slides v1）

### 5. スクリプトを保存して実行

1. 保存（Ctrl+S）
2. スプレッドシートに戻り、メニューの **「📋 発表会サイト管理」** をクリック
3. **「🔧 初期セットアップ（シート生成）」** を実行
   → 「設定」「グループ一覧」「生徒対応」の3シートが自動生成されます

### 6. 各シートに情報を入力

**「設定」シート（B列）：**

| キー | 入力内容 |
|------|---------|
| GitHub Owner | GitHub のユーザー名または組織名 |
| GitHub Repo | リポジトリ名（例: `sogo-tankyu-report`） |
| Classroom Course ID | Classroom のコースID（URL の末尾の数字） |
| Report Assignment ID | レポート課題のID（下記参照） |
| Slides Assignment ID | スライド課題のID |
| Output Folder ID | PDF 保存先の Drive フォルダID |
| Event Title / Event Date / Notice | サイトに表示するタイトル・日付・お知らせ |
| Allowed Domain | 閲覧を許可する Google アカウントのドメイン（例: `school.ed.jp`。空欄なら制限なし） |
| Google Client ID | 閲覧制限用の OAuth クライアントID（Allowed Domain を使う場合のみ） |

> **Classroom の課題IDの確認方法：**
> 課題を開いて URL の末尾 `.../details/課題ID` の数字部分

**「グループ一覧」シート：**
A〜F列（group_id〜theme_detail）を手入力。G列以降はスクリプトが自動入力します。
**列の並び順は変えないでください**（詳細: `docs/DATA_SCHEMA.md`）。

**「生徒対応」シート：**
生徒の**学校アカウントのメールアドレス**と group_id の対応を入力（同じグループの全員分）。
※ 氏名ではなくメールアドレスで照合するため、同姓同名でも正しく紐付きます。

### 7. GitHub トークンを設定（シートには貼らない）

1. GitHub で **Fine-grained personal access token** を発行する
   - Settings → Developer settings → **Fine-grained tokens** → Generate new token
   - **Repository access**: 対象リポジトリ **1つだけ** を選択
   - **Permissions**: Contents → **Read and write** のみ
   - **Expiration**: 1年など（切れたら再発行して再設定）
2. スプレッドシートのメニュー **「📋 発表会サイト管理 → 🔑 GitHub トークンを設定」** を開き、トークンを貼り付けて OK

> トークンは Apps Script の**スクリプト プロパティ**に保存され、シートの閲覧者には見えません。
> ⚠️ シートのセルにトークンを貼る旧運用はやめてください（シートを共有した相手全員に見えてしまいます）。

---

## 運用フロー（発表会当日までの作業）

```
課題締切後、メニューから「⚡ すべて一括実行」をクリック
    ├─ ① Classroom の提出物を取得し、メールアドレスでグループに紐付け
    ├─ ② Google Drive 上で PDF 変換、「組織内のみ」共有、URL を自動取得
    └─ ③ schedule.json を生成して GitHub にプッシュ
         → Vercel が自動デプロイ（数分で反映）

途中で確認ダイアログは出ません。完了時に1回だけ結果が表示されます。
エラー時は ①②③ を個別に実行して原因を切り分けられます。
```

### 生徒が再提出した場合

メニューの **「♻️ PDFを再変換（URL列をクリア）」** を実行してください。
group_id を指定すればそのグループだけ、空欄なら全グループの PDF を作り直します。
その後 **「③ サイトに反映」** を実行します。

---

## レポートテンプレートの作成

**「📄 レポートテンプレートを作成」** ボタンを押すと、
A4縦・2ページのレポートテンプレート（Google Slides）が自動生成されます。

生成されたファイルを Classroom の課題に添付し、
**「生徒全員にコピーを配布」** に設定することで、
生徒が各自のコピーに書き込む形になります。

---

## 制限事項

- Apps Script の1回の実行は**最大6分**です。グループ数が多く途中で止まった場合は、①②③を個別に実行してください（②は変換済みの行をスキップするので、再実行すれば続きから処理されます）。
