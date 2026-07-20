# deployment.md — GitHub / Vercel 対応表

各アプリのデプロイ構成をまとめた表。**Vercel設定の変更・環境変数の変更は、必ずオーナーが手動で行う**こと（Claude Code は変更しない）。

---

## 現状の構成（重要）

- **モノレポ移行を順次実施中。** 以下のアプリは Vercel の Connected Repository を `Masahieo-A/Aomatsu_web` に切替済みで、`main` への push（各 Root Directory 配下の変更時）で自動デプロイされる:
  - ポータル（Root: `/`）
  - APP004 Cloze+整序（Root: `apps/app-cloze-seijo-maker`）
  - APP001 英作文添削（Root: `apps/app-eisaku-tensaku`）
  - APP005 発音チェック（Root: `apps/app-elsa-like`）
- **APP002 整序メーカー / APP003 Cloze Maker は廃止**（APP004 に統合）。モノレポからフォルダ削除・ポータルからカード除外済み。旧GitHubリポジトリ・旧Vercelプロジェクトはオーナーが削除/アーカイブ予定。
- **2026-07-20: 全12アプリのコードをモノレポへ完全統合済み**（原本フォルダは `~/Archive/_monorepo統合退避_2026-07-20/` に退避、コードの正本はこのリポジトリ）。下記「切替待ち」のアプリは、Vercel の接続先がまだ旧個別リポジトリのまま。
- 未移行アプリは、各 Vercel プロジェクトで **Settings → Git → Connected Repository を `Aomatsu_web` に変更し、Root Directory に `apps/app-xxx` を指定**する（下記「モノレポ移行時の手順」参照）。**URL はプロジェクトに紐づくため、この方法なら本番 URL・ブックマークは変わらない。**

---

## 対応表

| App | Local Path | Connected Repo | Root Directory | Vercel Project Name | Production URL | Env Vars |
|---|---|---|---|---|---|---|
| ポータル | `/` | `Masahieo-A/Aomatsu_web` ✅ | `/`（ルート） | `aomatsu-english-portal` | https://aomatsu-english-portal.vercel.app | なし |
| APP001 英作文添削 | `apps/app-eisaku-tensaku` | `Masahieo-A/Aomatsu_web` ✅ | `apps/app-eisaku-tensaku` | `eisaku-tensaku-app` | https://eisaku-tensaku-app.vercel.app | `GEMINI_API_KEY` |
| APP004 Cloze+整序 | `apps/app-cloze-seijo-maker` | `Masahieo-A/Aomatsu_web` ✅ | `apps/app-cloze-seijo-maker` | `cloze-seijo-maker` | https://cloze-seijo-maker.vercel.app | Supabase（整備中） |
| APP005 発音チェック | `apps/app-elsa-like` | `Masahieo-A/Aomatsu_web` ✅ | `apps/app-elsa-like` | `elsa-like` | https://elsa-like.vercel.app | なし |
| ~~APP002 整序メーカー~~ | 削除済み | — | — | `seijo-maker`（削除予定） | ~~seijo-maker.vercel.app~~ | — |
| ~~APP003 Cloze Maker~~ | 削除済み | — | — | `cloze-maker`（削除予定） | ~~cloze-maker.vercel.app~~ | — |

### 切替待ち（デプロイ済み・接続先が旧個別リポジトリのまま）

| App | Root Directory（切替時に設定） | 現在の Connected Repo | Vercel Project Name | Production URL | Env Vars |
|---|---|---|---|---|---|
| APP006 育てるAI | `apps/app-sodateru-ai` | `Masahieo-A/sodateru-ai` | `sodateru-ai`（prj_O4TsGSy5WvrAUgu1MREdq7sUFAGC） | https://sodateru-ai.vercel.app | GEMINI_API_KEY / Supabase 3種 / 教員PW |
| APP008 着眼点③ | `apps/app-viewpoint` | `Masahieo-A/viewpoint` | `viewpoint` | https://viewpoint.vercel.app 系 | なし |
| APP010 総合探究発表会 | `apps/app-sogo-tankyu-report` | `Masahieo-A/sogo-tankyu-report` | （sogo-happyo） | https://sogo-happyo.vercel.app | なし（Apps Script連携） |
| APP012 未来の図書館 | `apps/app-mirai-library` | Git未接続（CLI直デプロイ） | `image_2.0`（prj_c92R3MT7JGHDdSR45ufDC9xNA4D6） | image_2.0 系 | NextAuth / Google OAuth / Supabase / OpenAI |
| APP016 保護者懇談会 | `apps/app-parent-teacher-meeting` | `Masahieo-A/parent-teacher-meeting` | `parent-teacher-meeting`（prj_DTYEtHmg6Eu74DjKAPGb7eyTONJP） | parent-teacher-meeting 系 | なし |
| APP017 併願照合ナビ | `apps/app-heigan-navi` | `Masahieo-A/heigan_search` | （heigan-search） | https://heigan-search.vercel.app | なし（JSONデータ同梱） |
| APP018 青松問答 | `apps/app-aomatsu-mondo` | `Masahieo-A/aomatsu-mondo` | （aomatsu-mondo） | https://aomatsu-mondo.vercel.app | Supabase 3種 + SITE_URL |

> ⚠️ 切替時の注意: モノレポ版の静的アプリ（APP008/010/016）と各Next.jsアプリはポータル共通ヘッダー・緑基調テーマ適用済みのため、**切替と同時に本番の見た目が変わる**（機能は同じ）。切替完了までは旧個別GitHubリポジトリを削除しないこと。

### 未デプロイ（切替作業なし・デプロイする時からモノレポ連携で作成）

- APP007 ZDP（`apps/app-zdp`・npm workspaces）/ APP009 探究サポート（`apps/app-tankyu-support`）/ APP011 3Dルームビューアー（`apps/app-3d-modeling`）/ APP013 Viewpoint教材オーサリング（`apps/app-html-maker`）
- APP014 口頭試問（`apps/app-oral-exam-generator`）はローカル専用運用
- APP015 VQ問題メーカー（`apps/app-vq-question-maker`）は FastAPI バックエンドを含むため Vercel 単体では不可（frontend のみ可）

> すべて同一 Vercel チーム（org: `team_48IzfiiYdsd5KvTIG7Mx7ELc`）に所属。✅ = モノレポ連携済み（`main` push で自動デプロイ）。

---

## 環境変数（Environment Variables）

| 変数名 | 使うアプリ | 取得場所 | 設定場所 |
|---|---|---|---|
| `GEMINI_API_KEY` | APP001 | [Google AI Studio](https://aistudio.google.com/) → Get API key | Vercel → プロジェクト → Settings → Environment Variables |
| `NEXT_PUBLIC_SUPABASE_URL`（予定） | APP004 | Supabase → Project Settings → API | Vercel → Environment Variables |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`（予定） | APP004 | Supabase → Project Settings → API | Vercel → Environment Variables |

- **秘密情報は Git に絶対に含めない。** `.env` / `.env.local` は `.gitignore` で除外済み。
- 各アプリのローカル開発では `.env.local` に同じ変数を置く（`.env.example` をコピーして使う）。

---

## Deploy Notes

- 各 Next.js アプリの Build Command は標準（`next build`）、Output は Vercel が自動検出。
- ポータルは静的サイト（ビルド不要、`index.html` を配信）。`vercel.json` でセキュリティヘッダを付与。
- APP005（静的HTML）も `vercel.json` を持ち、マイク用に `microphone=(self)` を許可している。

---

## モノレポ移行時の手順（将来・任意）

> 現在は各個別リポジトリからデプロイ中。一本化したくなった場合のみ実施。**実行前にオーナー承認必須。**

1. 対象アプリのコードがこのモノレポに入っていることを確認。
2. Vercel ダッシュボード → 対象プロジェクト → Settings → Git。
3. Connected Repository を `Masahieo-A/Aomatsu_web` に変更。
4. Root Directory を `apps/app-xxx` に設定。
5. 環境変数が新接続側にも設定されているか確認。
6. プレビューデプロイを1回実行し、成功・表示を確認してから本番反映。
7. 1アプリずつ行い、各アプリのURLが正常表示されることを確認してから次へ。
8. 移行完了後、旧個別リポジトリは「アーカイブ」を推奨（削除は履歴消失リスクがあるため非推奨）。
