# データ構成（スプレッドシートの列と schedule.json のキー）

このサイトのデータは **Google スプレッドシートの「グループ一覧」シートがマスタ**です。
Apps Script（`apps-script/` 参照）がシートを読み取って `data/schedule.json` を生成し、GitHub にプッシュします。

---

## ⚠️ 「グループ一覧」シートの列は **並び順固定** です

Apps Script は列を **位置（A列・B列…）で参照**します。列の並び替え・途中への列挿入をすると、データが壊れます。

| 列 | 内容 | 記入者 |
|----|------|--------|
| A | `group_id`（例: `101`。クラス+班の番号など、グループごとに一意） | 教員 |
| B | `group_name`（例: 1年1組 1班） | 教員 |
| C | `timeslot_label`（例: 第1発表（9:00〜9:45）） | 教員 |
| D | `room_name`（例: 101教室） | 教員 |
| E | `theme_title`（探究テーマ） | 教員 |
| F | `theme_detail`（発表概要） | 教員 |
| G | `report_file_id` | **自動**（スクリプト） |
| H | `slides_file_id` | **自動**（スクリプト） |
| I | `report_pdf_drive_url` | **自動**（スクリプト） |
| J | `report_pdf_embed_url` | **自動**（スクリプト） |
| K | `slides_pdf_drive_url` | **自動**（スクリプト） |
| L | `slides_pdf_embed_url` | **自動**（スクリプト） |

- **M列以降への列追加は自由**です（メモ・担当者など。サイトには出力されません）。
- 1行目のヘッダー文言は表示用で、変更してもスクリプトの動作には影響しません（位置参照のため）。
- どうしても列構成を変えたい場合は、`apps-script/config.gs` の `COL` 定義を合わせて修正してください。

---

## schedule.json のキー（サイトが参照するもの）

### 先頭（イベント情報）— 「設定」シートから生成

| キー名 | 元になる設定 | 説明 |
|--------|-------------|------|
| `eventTitle` | Event Title | サイトのタイトル |
| `eventDate` | Event Date | ヒーローに表示する開催日 |
| `notice` | Notice | ページ上部のお知らせ（空なら非表示） |
| `auth.client_id` | Google Client ID | 閲覧制限用の OAuth クライアントID（空なら制限なし） |
| `auth.allowed_domain` | Allowed Domain | 閲覧を許可する Google アカウントのドメイン（空なら制限なし） |

### 各グループ（`groups` 配列）

| キー名 | 説明 |
|--------|------|
| `group_id` | グループ識別子（例: `101`）。詳細ページの URL に使う。**必須** |
| `group_name` | グループ名 |
| `timeslot_label` | 時間帯 |
| `room_name` | 教室名 |
| `theme_title` | 探究テーマ |
| `theme_detail` | 発表概要 |
| `pdf_drive_url` | 探究レポート PDF を新規タブで開く URL |
| `pdf_embed_url` | 探究レポート PDF の埋め込み表示用 URL |
| `slides_pdf_drive_url` | 発表スライド PDF を新規タブで開く URL |
| `slides_pdf_embed_url` | 発表スライド PDF の埋め込み表示用 URL |

- URL 系のキーは空でもよく、その場合サイトには表示されません。
- **セキュリティ**: サイトは `https://drive.google.com` / `https://docs.google.com` / サイト内パス（`/…`）以外の URL を表示しません（`common.js` の `isSafeUrl`）。

---

## 「生徒対応」シート

| 列 | 内容 |
|----|------|
| A | 生徒の**メールアドレス**（学校の Google アカウント。大文字小文字は区別しない） |
| B | `group_id` |
| C | 氏名（メモ用・任意） |

Classroom の提出者はメールアドレスで照合します（同姓同名・氏名の表記ゆれの影響を受けないため）。
