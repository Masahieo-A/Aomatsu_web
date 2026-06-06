# deployment.md — GitHub / Vercel 対応表

各アプリのデプロイ構成をまとめた表。**Vercel設定の変更・環境変数の変更は、必ずオーナーが手動で行う**こと（Claude Code は変更しない）。

---

## 現状の構成（重要）

- 各アプリは **それぞれ独立した GitHub リポジトリ** から Vercel に個別デプロイされている。
- このモノレポ（`Aomatsu_web`）に各アプリのソースを統合したが、**ライブのVercelデプロイは現在も個別リポジトリ側を見ている**。
  → つまりこのリポジトリ内でアプリを再構成しても、本番デプロイには影響しない。
- 将来、デプロイ元をモノレポに一本化する場合は、各 Vercel プロジェクトで
  **Settings → Git → Connected Repository を `Aomatsu_web` に変更し、Root Directory に `apps/app-xxx` を指定**する（下記「モノレポ移行時の手順」参照）。

---

## 対応表

| App | Local Path | Current GitHub Repo | Future Monorepo Path | Vercel Project Name | Production URL | Env Vars |
|---|---|---|---|---|---|---|
| ポータル | `/` | `Masahieo-A/Aomatsu_web` | `/`（ルート） | `aomatsu-english-portal` | https://aomatsu-english-portal.vercel.app | なし |
| APP001 英作文添削 | `apps/app-eisaku-tensaku` | `Masahieo-A/eisaku-tensaku-app` | `apps/app-eisaku-tensaku` | `eisaku-tensaku-app` | https://eisaku-tensaku-app.vercel.app | `GEMINI_API_KEY` |
| APP002 整序メーカー | `apps/app-seijo-maker` | `Masahieo-A/seijo-maker` | `apps/app-seijo-maker` | `seijo-maker` | https://seijo-maker.vercel.app | なし |
| APP003 Cloze Maker | `apps/app-cloze-maker` | `Masahieo-A/cloze-maker` | `apps/app-cloze-maker` | `cloze-maker` | https://cloze-maker.vercel.app | なし |
| APP004 Cloze+整序 | `apps/app-cloze-seijo-maker` | `Masahieo-A/cloze-seijo-maker` | `apps/app-cloze-seijo-maker` | `cloze-seijo-maker` | https://cloze-seijo-maker.vercel.app | Supabase（整備中） |
| APP005 発音チェック | `apps/app-elsa-like` | `Masahieo-A/ELSA-like` | `apps/app-elsa-like` | `elsa-like` | https://elsa-like.vercel.app | なし |

> すべて同一 Vercel チーム（org: `team_48IzfiiYdsd5KvTIG7Mx7ELc`）に所属。

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
