# ZDP 英語つまずき診断アプリ & 文法項目マスタ管理アプリ

ヴィゴツキーの ZPD（発達の最近接領域）理論に基づく英語学習支援システム。2つのWebアプリを**モノレポ**で管理します。

| アプリ | 対象ユーザー | 役割 |
|--------|-------------|------|
| **ZDPアプリ** (`apps/zdp`) | 生徒（高校生）・教師 | 「分からない英文」の躓き原因を切り分け診断し、i+1難易度の類似例文で反復学習させる |
| **マスタアプリ** (`apps/master-editor`) | 開発者（英語教員） | ZDPアプリの「脳」＝`grammar_master.json` を作成・テスト検証・育成する |

2つは `grammar_master.json` を通じて連携します。マスタアプリが品質保証済みの文法知識を書き出し、ZDPアプリがそれを読み込んで診断に使います。

> 元となる要件定義: [`docs/要件定義.md`](docs/要件定義.md) / [`docs/プロンプト設計.md`](docs/プロンプト設計.md) / [`docs/文法項目マスタ_要件定義.md`](docs/文法項目マスタ_要件定義.md)

---

## 0. aomatsu-web（青松English Hub）への統合について

本ディレクトリは学校ポータル monorepo **aomatsu-web** の `apps/app-zdp` として取り込んだものです。内部は元の ZDP monorepo 構成（npm workspaces：`apps/zdp` 生徒用診断 / `apps/master-editor` マスタ管理 / `packages/*` 共有）をそのまま保持しています。ビルド・起動は本ディレクトリ内で完結します（下記コマンドは `apps/app-zdp` 直下で実行）。

**トンマナ統合（生徒用診断アプリ `apps/zdp` のみ適用）**：`docs/design-system.md`（aomatsu-web 側）のカラーパレット・フォント・「ポータルへ戻るヘッダー」を反映済み。変更はグローバル CSS / レイアウト層に限定し、診断ロジックには手を入れていません。

- `apps/zdp/tailwind.config.js`：`brand` を緑基調（`#2d6a4f` / dark `#1f5238` / light `#52b788` / dim `#d8f3dc`）へ変更、`fontFamily.sans` を追加。
- `apps/zdp/app/globals.css`：`--color-*` CSS 変数、`body` の背景（`#f8f7f4`）・本文色（`#1a1714`）・フォント・行間、`.choice` のホバー/選択色を緑（`brand-dim`）へ。
- `apps/zdp/app/layout.tsx`：全画面上部に English Hub ポータルへ戻る sticky ヘッダーを追加。

> マスタ管理アプリ（`apps/master-editor`）は開発者専用のため、トンマナ適用対象外（原本のまま）。

---

## 目次
1. [ディレクトリ構成](#1-ディレクトリ構成)
2. [クイックスタート（キー不要・モックモード）](#2-クイックスタートキー不要モックモード)
3. [設定すべきAPI・環境変数](#3-設定すべきapi環境変数)
4. [Googleスプレッドシートの準備（ZDPアプリのDB）](#4-googleスプレッドシートの準備zdpアプリのdb)
5. [マスタデータの保存場所（Google Drive）](#5-マスタデータの保存場所google-drive)
6. [ZDPアプリの使い方](#6-zdpアプリの使い方)
7. [マスタアプリの使い方と日常運用フロー](#7-マスタアプリの使い方と日常運用フロー)
8. [2アプリの連携（データ引き継ぎ）](#8-2アプリの連携データ引き継ぎ)
9. [デプロイ（Vercel）](#9-デプロイvercel)
10. [設計上の重要ポイント](#10-設計上の重要ポイント)
11. [ライセンス表記](#11-ライセンス表記)

---

## 1. ディレクトリ構成

```
ZDP/
├─ packages/
│  ├─ prompts/        P-01〜P-06 プロンプト（両アプリ共有・単一の正）
│  │  ├─ templates/*.md   ← プロンプト本文（docs/プロンプト設計.md 由来・編集可）
│  │  └─ src/index.ts     ← render() ローダ
│  └─ schema/         grammar_master のスキーマ＋検証（DAG・参照整合性）
│     └─ src/index.ts
├─ apps/
│  ├─ zdp/            生徒向け診断アプリ（Next.js / port 3000）
│  │  ├─ app/         UI + API Routes（/api/analyze, /probe, /diagnose, /similar, /feedback, /master）
│  │  ├─ lib/         gemini / cefr / surface / diagnosis / master / repository
│  │  └─ data/        grammar_master.sample.json（ダミー20項目）, cefrj-wordlist.sample.csv
│  └─ master-editor/  マスタ管理アプリ（Next.js / port 3100）
│     ├─ app/         ダッシュボード / 項目編集 / テストベンチ / 前提グラフ / クイックメモ
│     ├─ lib/         store（master_working.json）/ gemini（P-01共有）
│     └─ data/        seed_master.json（初期シード）
├─ .env.example
└─ README.md
```

**なぜモノレポか**: プロンプト（`packages/prompts`）とスキーマ（`packages/schema`）を1箇所に置き、両アプリから参照します。これにより「テストベンチの判定＝本番の判定」の同一性（マスタアプリの存在意義）が構造的に保証されます。

---

## 2. クイックスタート（キー不要・モックモード）

APIキーやGoogle設定が**無くても**、モックモードで全機能の動作を確認できます。

```bash
# 1. 依存インストール（ルートで1回）
npm install

# 2. プロンプトテンプレートを生成（初回・テンプレート編集時）
npm run sync-prompts

# 3a. ZDPアプリを起動 → http://localhost:3000
npm run dev:zdp

# 3b. マスタアプリを起動（別ターミナル）→ http://localhost:3100
npm run dev:master
```

- `GEMINI_API_KEY` 未設定 → LLM呼び出しはモック応答（画面右上に `MOCK` 表示）。フローの確認に十分です。
- Google認証情報 未設定 → ZDPのログは `apps/zdp/.data/*.json` に、マスタは `apps/master-editor/.data/master_working.json` にローカル保存されます。

本番運用（実際のGemini判定・スプレッドシート記録）にするには、次章の設定を行います。

---

## 3. 設定すべきAPI・環境変数

`.env.example` を各アプリ直下に `.env.local` としてコピーして設定します。

```bash
cp .env.example apps/zdp/.env.local
cp .env.example apps/master-editor/.env.local
```

### 3.1 Gemini API（両アプリ必須・これだけで実運用可能）
1. [Google AI Studio](https://aistudio.google.com/app/apikey) でAPIキーを発行
2. `.env.local` に設定:
   ```
   GEMINI_API_KEY=発行したキー
   GEMINI_MODEL=gemini-flash-latest
   ```
> **制約**: モデルは Flash 系統のみ（要件）。上位モデルは使用しません。弱いモデルで精度を出すため、候補絞り込み・self-consistency・キャッシュ・検証プロンプトを実装しています。

| 環境変数 | 対象 | 必須 | 説明 |
|----------|------|------|------|
| `GEMINI_API_KEY` | 両方 | ◎ | 未設定ならモック |
| `GEMINI_MODEL` | 両方 | ○ | 既定 `gemini-flash-latest` |
| `GOOGLE_SHEETS_ID` | zdp | △ | 未設定ならローカルJSON |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | zdp | △ | サービスアカウント |
| `GOOGLE_PRIVATE_KEY` | zdp | △ | `\n`エスケープした秘密鍵 |
| `MASTER_DATA_DIR` | master | △ | マスタ保存先（既定 `.data`）。Google Drive同期フォルダを指定可 |
| `MASTER_BASIC_USER/PASS` | master | △ | 簡易認証（Phase 2 で利用） |

---

## 4. Googleスプレッドシートの準備（ZDPアプリのDB）

ZDPアプリのログ（学習履歴・キャッシュ）をGoogleスプレッドシートに保存する場合の手順です。**未設定でもローカルJSONで動作します。**

### 4.1 サービスアカウントの作成
1. [Google Cloud Console](https://console.cloud.google.com/) でプロジェクトを作成
2. 「APIとサービス」→ **Google Sheets API** を有効化
3. 「認証情報」→「サービスアカウントを作成」→ JSONキーをダウンロード
4. JSONの `client_email` を `GOOGLE_SERVICE_ACCOUNT_EMAIL` に、`private_key` を `GOOGLE_PRIVATE_KEY` に設定
   - `private_key` は改行を `\n` に置換し、ダブルクォートで囲んで1行にします

### 4.2 スプレッドシートの作成
1. 新規スプレッドシートを作成し、URLの `/d/` と `/edit` の間の**ID**を `GOOGLE_SHEETS_ID` に設定
2. **サービスアカウントのメールアドレスを「編集者」として共有**（重要）
3. 以下の**6枚のシート**を作成し、それぞれ**1行目にヘッダ**を入れます（列名は下記の通り厳密に）:

| シート名 | 1行目のヘッダ（この順・この名前で） |
|----------|-----------------------------------|
| `learners` | `learner_id, display_name, current_level, created_at` |
| `sessions` | `session_id, learner_id, input_sentence, sentence_hash, identified_items, root_cause, started_at, ended_at` |
| `responses` | `response_id, session_id, probe_type, item_id, question, answer, is_correct, confidence, quadrant, answered_at` |
| `weakness_history` | `learner_id, item_id, status, error_count, last_seen` |
| `sentence_cache` | `sentence_hash, sentence, analysis_json, verified, hit_count` |
| `api_log` | `date, call_type, prompt_version, token_in, token_out, cached` |

> 書き込みは append ベース（要件 §5）。同時書き込みに弱いスプレッドシートの特性に配慮し、読み込みは最新行優先で解決します。書き込み失敗時もセッションは継続します（ローカルにフォールバック）。将来生徒数が増えた場合は Repository パターン（`apps/zdp/lib/repository/`）を差し替えるだけで Supabase 等へ移行できます。

---

## 5. マスタデータの保存場所（Google Drive）

マスタアプリの**正データ**は `master_working.json`（全ステータス・編集用）です。要件に従い「正が1箇所であること」を厳守します。

- 既定の保存先: `apps/master-editor/.data/`
- **Google Drive で管理する場合**: PCにGoogle Drive（デスクトップ版）を同期し、そのローカルパスを `MASTER_DATA_DIR` に指定します。例:
  ```
  MASTER_DATA_DIR=/Users/you/Google Drive/マイドライブ/文法項目マスタ
  ```
- 保存のたびに `backups/master_<timestamp>.json` が自動生成されます（データ喪失防止）。
- エクスポート成果物は `exports/grammar_master_v{n}_{日付}.json` と `exports/grammar_master_latest.json` に保存されます（上書きしない）。

---

## 6. ZDPアプリの使い方

`http://localhost:3000`

### 生徒フロー
1. **英文入力**: 分からない英文と現在レベル（A1〜B2）を入力（任意でクラスコード＋出席番号）
2. **語彙チェック**: CEFR-J照合で検出した難単語のうち「意味を知っている語」をタップ（LLM不使用）
3. **確認プローブ**: 表層パターンで絞り込んだ文法項目について、4択＋確信度(1〜5)で回答
4. **診断結果**: 「あなたの躓きは○○の可能性が高い」＋足場（前提項目）を提示
5. **類似例文で練習**: i+1難易度の検証済み例文＋問い返し型フィードバック（ヒントは段階的にエスカレート）

### 教師フロー（`/teacher`）
- 現在のマスタの状態確認
- **T-02**: マスタアプリからエクスポートした `grammar_master.json` をアップロードして差し替え（スキーマ検証・バージョン照合付き）

### 内部処理（ブレ最小化アーキテクチャ）
`STEP1 前処理（プログラム）` → `STEP2 P-01タグ付け（self-consistency 3回多数決）` → `STEP3 P-02プローブ` → `STEP4 4象限分類` → `STEP5 P-03生成＋P-04検証＋P-05フィードバック`。同一英文の2回目はキャッシュヒットし、STEP1-2のAPI呼び出しはゼロになります。

---

## 7. マスタアプリの使い方と日常運用フロー

`http://localhost:3100`

| 画面 | 機能 |
|------|------|
| ダッシュボード | ステータス別・レベル別カバレッジ、エクスポート/インポート/CSV |
| 新規項目・項目編集 | スキーマ準拠フォーム。陽性例のspanは英文を選択して「選択→span」で指定。複製・削除 |
| クイックメモ | スマホから30秒で `status: memo` 登録（授業中用） |
| テストベンチ | 登録例文をP-01で判定し正答率を測定。誤判定の詳細（votes/evidence）を表示。verified昇格 |
| 前提グラフ | prerequisitesの依存グラフ（Mermaid）。孤立項目検出、学習経路ハイライト、クリックで編集へ |

### 日常運用フロー
```
【授業中】生徒の躓きに気づく → クイックメモ登録（memo）
【放課後】memoを清書 → 判定基準・陽性例3・陰性例2・誤解・プローブ雛形を記述（draft）
        → テストベンチ実行
            正答率 < 90% → 誤判定を分析（B-03）→ 記述を修正 → 再テスト
            正答率 ≥ 90% かつ runs ≥ 10 → verified に昇格
        → 前提グラフで位置づけ確認・prerequisites設定 → published に昇格
【月1回】published全件をエクスポート → ZDPアプリへ供給 / 一括回帰テスト（B-06）
```

昇格条件（自動チェック）: **陽性例3件以上・陰性例2件以上・テスト正答率90%以上・runs 10回以上**。満たさない項目はverified/publishedにできません。

---

## 8. 2アプリの連携（データ引き継ぎ）

マスタアプリ「ダッシュボード → エクスポート」で `grammar_master.json` を生成します。**publishedの項目のみ**が対象で、エクスポート時に以下を自動検証し、1つでも失敗すると中止します（要件 §6.2）:

- **V-1** スキーマ準拠（必須フィールド・型）
- **V-2** 参照整合性: published項目の `prerequisites`・`parent_id` の指す先もpublishedであること
- **V-3** DAG検証（published集合内で循環なし）
- **V-4** ID重複なし

生成したJSONを、ZDPアプリの `/teacher` からアップロード（MVP）します。ZDPアプリは読み込み時に `schema_version` を照合し、非対応メジャーバージョンは読み込みを拒否して直前の正常版で稼働を継続します。

> **ID永続性の契約**: 一度発行したIDは削除・再利用しません（ZDPアプリの `weakness_history` が参照するため）。廃止する項目は `status: deprecated` にします。

---

## 9. デプロイ（Vercel）

2つのアプリを**別々のVercelプロジェクト**としてデプロイします（同一リポジトリ・異なるRoot Directory）。

| 設定項目 | ZDPアプリ | マスタアプリ |
|----------|-----------|-------------|
| Root Directory | `apps/zdp` | `apps/master-editor` |
| Framework | Next.js | Next.js |
| Build Command | 既定（`next build`） | 既定 |
| 環境変数 | 第3章の値を設定 | `GEMINI_API_KEY` 等 |

> Vercel はモノレポの Root Directory 指定に対応しています。`transpilePackages` 設定済みなので `packages/*` も正しくビルドされます。
>
> **注意（サーバレスの永続化）**: Vercelのファイルシステムは一時的です。ローカルJSONフォールバックは開発用です。本番では ZDPアプリは**Googleスプレッドシート**を、マスタアプリは `MASTER_DATA_DIR` に**永続ボリューム/Google Drive同期環境**を使うか、**ローカル実行**（マスタアプリは個人用のためローカル運用でも成立する設計）を推奨します。

GitHub/Vercelの作成・Import・デプロイはご自身で行ってください（トークンは共有不要、SSH pushのみで運用できます）。

---

## 10. 設計上の重要ポイント

- **プロンプトのハードコード禁止**: 全プロンプトは `packages/prompts/templates/*.md`（`docs/プロンプト設計.md` 由来）。`npm run sync-prompts` でランタイム用モジュールを生成。バージョンは `api_log` に記録（A/Bの土台）。
- **分類タスク化**: 「分析せよ」ではなく「候補からYES/NO」。候補は正規表現でプログラム側が5〜10件に絞る（`lib/surface.ts`）。マスタの中身に依存しない設計。
- **self-consistency**: P-01/P-06 は temperature 0.7 で3回実行し多数決。
- **キャッシュ資産化**: 教科書英文は全国共通。分析済み文・検証済み例文をハッシュキーで蓄積し、運用が進むほどAPI呼び出しが減る。
- **4象限分類**: 正誤×確信度 → mastered / zpd / error_candidate / mistake_candidate。同一項目2回以上のerror_candidate → Error確定。
- **個人情報最小化**: 氏名・メール非保存。学習者IDは「クラスコード-出席番号」ベースの匿名ID。

---

## 11. ライセンス表記

- **語彙難易度判定**: 本リポジトリ同梱の `apps/zdp/data/cefrj-wordlist.sample.csv` は動作確認用の**サンプル**です。実運用では正式な **CEFR-J Wordlist**（東京外国語大学 投野由紀夫研究室）に差し替えてください。同Wordlistの利用条件・クレジット表記に従う必要があります。
- 生成される `grammar_master.json` は実践研究の中核データになり得ます。エクスポート時のライセンス付与フィールドは schema_version 1.1 で検討予定です。

---

## 補足: 主なnpmスクリプト（ルート）

| コマンド | 説明 |
|----------|------|
| `npm run dev:zdp` | ZDPアプリを開発起動（:3000） |
| `npm run dev:master` | マスタアプリを開発起動（:3100） |
| `npm run build:zdp` / `build:master` | 本番ビルド |
| `npm run sync-prompts` | `templates/*.md` → 実行用テンプレートモジュールを再生成 |

---
開発者向け情報は [docs/構成.md](docs/構成.md) を、機能要件は [docs/要件定義.md](docs/要件定義.md) を参照。
