# Drive フォルダで PDF を「101」のように管理する方法

## 「フォルダのファイルパス」を JSON に渡してサイトで見ることはできるか？

**結論: できません。**

Google ドライブには、Windows の `C:\資料\101.pdf` のような**ファイルパス**はありません。Web サイトからは次のどちらかでしかアクセスできません。

- **各ファイルの「共有リンク（URL）」を JSON に 1 件ずつ書く**（今の仕組み）
- **フォルダ ID を使って Drive API で中身を一覧する**（API キーや認証が必要で、静的サイトだけでは難しい）

そのため、**「フォルダのパスを 1 つ JSON に渡したら、サイトで 101 を選ぶと資料が見られる」という仕組みは作れません。**

---

## 代わりにできること：フォルダで整理しつつ、リンクは「1回のスクリプト」で取得

**やりたいこと**:  
Drive のフォルダに `101.pdf`, `102.pdf`, … のように 42 本の PDF を置き、**サイトでは「101」を選ぶとその PDF が見られる**ようにしたい。

**やり方**:

1. **Drive のフォルダ**に、ファイル名を `101.pdf`, `102.pdf`, … のように保存する（整理はフォルダ＋ファイル名で行う）。
2. **「フォルダ ID を指定して実行するスクリプト」**を 1 回動かすと、そのフォルダ内の全ファイルから  
   - ファイル名 → `group_id`（例: 101）  
   - 各 PDF の「共有リンク」「埋め込み用リンク」  
   を取得する。
3. その結果を **スプレッドシートに貼る**か、**schedule.json 用のデータとして使う**。  
   → サイトでは従来どおり **group_id（101）を選ぶと、その PDF のリンクで資料が開く**ようにする。

つまり、

- **JSON に渡すのは「フォルダのパス」ではなく、「各グループ用の PDF の URL」**
- その URL を、**フォルダ内のファイル名（101 など）から自動で取り出す**ことで、手で 42 個コピーしなくてよい、という形にできます。

---

## 手順：フォルダから PDF リンクを一括取得する（Apps Script）

次のスクリプトは、**指定した Drive フォルダ ID** のなかのファイルを一覧し、  
ファイル名（例: `101.pdf`）から **group_id**（`101`）を取り出し、  
各ファイルの **共有URL** と **埋め込み用URL** を取得して、スプレッドシートの 1 シートに書き出します。

### 1. フォルダ ID を取得する

1. Google ドライブで、42 グループの PDF を入れたフォルダを開く。
2. ブラウザのアドレスバーの URL を確認する。  
   例: `https://drive.google.com/drive/folders/1ABCdefGHIjkLMnOpqRStUvWxYz`  
   **`/folders/` の後ろの英数字の並び**（ここでは `1ABCdefGHIjkLMnOpqRStUvWxYz`）が **フォルダ ID** です。

### 2. スプレッドシートでスクリプトを実行する

1. スプレッドシート（スケジュール用でよい）を開く → **拡張機能** → **Apps Script**。
2. 新しいスクリプトに、下のコードを貼り付ける。
3. 先頭の **`FOLDER_ID`** を、さきほどコピーした**フォルダ ID** に書き換える。
4. 関数 **`getPdfLinksFromFolder`** を選んで **実行**（初回は権限を許可）。
5. 実行後、**同じスプレッドシート**に「PDFリンク」という名前のシートができ、  
   列に **group_id**, **pdf_drive_url**, **pdf_embed_url** が入ります。  
   このシートの内容を、メインのスケジュールシートに**コピーまたは結合**して使うと、  
   **「101」を選ぶとその PDF が見られる」** サイトのデータになります。

```javascript
// ★ ここに Drive のフォルダ ID を貼る（URL の /folders/ の後ろ）
var FOLDER_ID = 'ここにフォルダIDを貼る';

/**
 * 指定フォルダ内の PDF を一覧し、ファイル名から group_id を取り出して
 * 共有リンク・埋め込みリンクを取得し、スプレッドシートに書き出す。
 */
function getPdfLinksFromFolder() {
  var folder = DriveApp.getFolderById(FOLDER_ID);
  var files = folder.getFilesByType(MimeType.PDF);
  var sheet = getOrCreateSheet('PDFリンク');
  sheet.clear();
  sheet.appendRow(['group_id', 'pdf_drive_url', 'pdf_embed_url']);
  var row;
  while (files.hasNext()) {
    var file = files.next();
    var name = file.getName();
    var groupId = name.replace(/\.pdf$/i, '').trim();
    var id = file.getId();
    var driveUrl = 'https://drive.google.com/file/d/' + id + '/view?usp=sharing';
    var embedUrl = 'https://drive.google.com/file/d/' + id + '/preview';
    sheet.appendRow([groupId, driveUrl, embedUrl]);
  }
  Logger.log('完了。シート「PDFリンク」を確認してください。');
}

function getOrCreateSheet(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  return sheet;
}
```

### 3. サイトでの動き（今の仕組みのまま）

- `schedule.json` の各グループに、**group_id**（例: `101`）と **pdf_drive_url** / **pdf_embed_url**（参考資料）、**slides_pdf_drive_url** / **slides_pdf_embed_url**（発表スライド PDF）が入っている。
- サイト上で「101」を選ぶと、そのグループの参考資料・発表スライドの PDF が開く。**発表スライドは PDF で保存する運用**のため、Google Slides の URL は使いません。

フォルダの「ファイルパス」を JSON に渡す代わりに、**フォルダから取り出したリンクを JSON（やスプレッドシート）に載せる**ことで、**「101 を選ぶと資料が見られる」** を実現しています。

---

## まとめ

| 質問 | 答え |
|------|------|
| フォルダのファイルパスを JSON に渡して、サイトで 101 を選ぶと資料が見られる？ | **いいえ。** ドライブの「パス」をサイトに渡してそのまま開く仕組みはない。 |
| フォルダに 101.pdf のように置いて、サイトで 101 を選ぶとその PDF を見られる？ | **はい。** フォルダ内のファイル名から group_id（101）と PDF の URL をスクリプトで取得し、その URL を JSON（スプレッドシート経由）に載せれば、今のサイトの仕組みで「101 を選ぶとその資料が見られる」ようにできる。 |

PDF はこれまでどおり **Drive の共有設定（組織内のみ）** にし、**JSON に渡すのは「フォルダパス」ではなく「各グループの PDF の URL」** という形にすると、フォルダで整理しつつサイトで 101 を選んで資料を見る運用ができます。
