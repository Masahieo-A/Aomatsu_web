import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";
import "./globals.css";

const notoSansJP = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["400", "500", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Cloze Test & 整序メーカー | English Hub",
  description: "クローズテストと整序問題を生成する英語学習ツール",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja" className={notoSansJP.className}>
      <body>
        {/* Portal header */}
        <header
          style={{
            background: "var(--app-accent)",
            color: "#fff",
            padding: "0.6rem 1.25rem",
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
          }}
        >
          <span
            style={{
              color: "rgba(255,255,255,0.75)",
              fontSize: "0.8rem",
              display: "flex",
              alignItems: "center",
              gap: "0.3rem",
            }}
          >
            🌿 English Hub
          </span>
          <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.8rem" }}>›</span>
          <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>
            Cloze Test &amp; 整序メーカー
          </span>
        </header>

        <main style={{ maxWidth: 860, margin: "0 auto", padding: "2rem 1rem 4rem" }}>
          {children}
        </main>

        <footer
          style={{
            textAlign: "center",
            padding: "1.5rem",
            fontSize: "0.78rem",
            color: "var(--muted-foreground)",
            borderTop: "1px solid var(--border)",
          }}
        >
          © 2025 English Hub
        </footer>
      </body>
    </html>
  );
}
