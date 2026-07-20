# 着眼点③ 教材（app-viewpoint）

英語授業用の静的HTML教材です。Lesson3 本文の等位接続詞（and / but / or）が「何と何を繋いでいるか」を、色分けと具体例で一目でわかるように整理しています。

- 対象: 生徒（自習・授業内参照用）
- `index.html`: Lesson3 着眼点③ — and / but / or の分析（単体ファイル完結）

## 技術構成

- 素のHTML/CSS。ビルド・依存パッケージなし。ブラウザで直接開いて確認できます。

```bash
open apps/app-viewpoint/index.html
# または簡易サーバーで確認
npx serve apps/app-viewpoint
```

## デザイン

- [../../docs/design-system.md](../../docs/design-system.md) のトンマナ（配色・フォント・ポータルへ戻るヘッダー）を適用済み。
- ただし and/or/but および構文要素A/B/Cを示す色分け（`--and` `--or` `--but` `--A` `--B` `--C` など）は教材内容として意味を持つため、ポータル共通パレットの対象外（変更していません）。

## 由来・原本

- 原本: `~/Projects/viewpoint`（個別リポジトリ、GitHub: `Masahieo-A/viewpoint`）。このディレクトリはその移設コピーです。原本の詳細は原本の `docs/構成.md` を参照。

開発者向け情報は [docs/構成.md](docs/構成.md) を参照。
