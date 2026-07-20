# app-3d-modeling — 3Dルームビューアー

青松 English Hub（学校ポータル monorepo）のサブアプリ。生徒がGAS上の簡易3Dモデリングツールで作成した部屋レイアウトを、リアルで高品質な3Dビューで閲覧できるWebアプリです（**閲覧専用 / View-only**）。

- 対象: 生徒（student）
- ポータル: https://aomatsu-english-portal.vercel.app
- UIシェル（ヘッダー・ルーム切替・操作説明）は `docs/design-system.md` のトンマナ（落ち着いた緑基調）に準拠。3D描画ロジックには変更を加えていません。

## 技術スタック

- **Next.js** (App Router) + TypeScript
- **React Three Fiber** + **@react-three/drei** + **@react-three/postprocessing** + **three**
- **Firebase Realtime Database**（ルームデータの読み込み）
- **Tailwind CSS** / **@radix-ui/react-tabs**

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. Firebase の設定

`.env.example` を `.env.local` にコピーし、Firebase プロジェクトの値を設定してください。

```bash
cp .env.example .env.local
```

必要な環境変数:

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_DATABASE_URL`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`

Firebase Realtime Database のデータ構造は `docs/要件定義.md` の「Firebase データ構造」を参照してください（パス: `/rooms/room1/objects`, `/rooms/room2/objects`）。

### 3. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開きます。

## 操作

- **左ドラッグ**: カメラ回転
- **右ドラッグ**: パン
- **スクロール**: ズーム
- 左上の **Room 1 / Room 2** で部屋を切り替え
- 右上の **?** で操作説明を表示
- ヘッダー左上のロゴから English Hub ポータルへ戻れます

## テクスチャ

`public/textures/` に画像を配置すると、プロシージャルテクスチャの代わりに使用されます。未配置の場合はコードで生成したテクスチャを使用します。詳細は `public/textures/README.md` を参照してください。

## ビルド・デプロイ

```bash
npm run build
npm start
```

Vercel にデプロイする場合は、環境変数を Vercel のダッシュボードで設定してください（現状は未デプロイ）。

## トンマナ適用箇所（monorepo統合時）

- `src/components/PortalHeader.tsx`: ポータルへ戻る共通ヘッダー（新規追加）
- `src/app/page.tsx`: ヘッダー + 3Dキャンバスの flex-column レイアウトへ変更
- `src/app/globals.css`: design-system のカラートークン・フォントを追加
- `src/components/RoomSwitcher.tsx` / `HelpOverlay.tsx`: 緑基調のオーバーレイUIへ調整
- `src/components/RoomViewer.tsx` / `LoadingScreen.tsx`: ローディング/エラー画面の配色を統一

※ `src/components/objects/*`・`Scene.tsx`・`SceneContainer.tsx` など3D描画ロジックは未変更。

---
開発者向け情報は [docs/構成.md](docs/構成.md) と [docs/要件定義.md](docs/要件定義.md) を参照。
