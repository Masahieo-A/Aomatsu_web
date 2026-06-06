import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";
import "./globals.css";

const notoSansJP = Noto_Sans_JP({ subsets: ["latin"], weight: ["400","500","700","800"], display: "swap" });

export const metadata: Metadata = {
  title: "Cloze Test Maker | English Hub",
  description: "クローズテスト（穴埋め問題）を生成する英語学習ツール",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className={notoSansJP.className}>
      <body>
        <header style={{ background: "var(--app-accent)", color: "#fff", padding: "0.6rem 1.25rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <a href="https://aomatsu-english-portal.vercel.app" style={{ color: "rgba(255,255,255,0.75)", fontSize: "0.8rem", textDecoration: "none" }}>🌿 English Hub</a>
          <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.8rem" }}>›</span>
          <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>Cloze Test Maker</span>
        </header>
        <main style={{ maxWidth: 860, margin: "0 auto", padding: "2rem 1rem 4rem" }}>
          {children}
        </main>
        <footer style={{ textAlign: "center", padding: "1.5rem", fontSize: "0.78rem", color: "var(--muted-foreground)", borderTop: "1px solid var(--border)" }}>
          © 2025 English Hub
        </footer>
      </body>
    </html>
  );
}
