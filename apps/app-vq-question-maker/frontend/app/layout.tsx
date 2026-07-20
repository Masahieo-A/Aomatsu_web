import "./globals.css";

export const metadata = {
  title: "Vision Quest風問題メーカー",
  description: "英文から思考のヒント付き空欄補充問題を生成",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>
        <header className="portal-header">
          <a
            href="https://aomatsu-english-portal.vercel.app"
            className="site-logo"
          >
            <span className="logo-mark">🌿</span>
            English Hub
          </a>
          <span className="portal-sep">›</span>
          <span className="portal-current">Vision Quest風問題メーカー</span>
        </header>
        <div className="app-shell">
          <header className="header">
            <div>
              <p className="app-title">Vision Quest風問題メーカー</p>
              <p className="app-subtitle">
                英文法の「考え方」を問う空欄補充問題を生成
              </p>
            </div>
            <a className="ghost-button" href="#generated-exercises">
              生成例を見る
            </a>
          </header>
          <main className="content">{children}</main>
        </div>
      </body>
    </html>
  );
}
