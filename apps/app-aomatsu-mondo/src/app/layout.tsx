import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "青松問答 | English Hub",
  description: "青松AIのデータ収集アプリ「青松問答」",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        {/* ===== English Hub 共通ヘッダー（ポータルへ戻る導線） ===== */}
        <header className="sticky top-0 z-50 flex h-[52px] items-center gap-3 border-b border-[#e2ddd8] bg-white px-5">
          <a
            href="https://aomatsu-english-portal.vercel.app"
            className="flex items-center gap-2 font-bold text-[15px] text-[#1a1714] no-underline"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] bg-[#2d6a4f] text-sm text-white">
              🌿
            </span>
            English Hub
          </a>
          <span className="text-[#e2ddd8]">›</span>
          <span className="text-sm font-semibold text-[#1a1714]">青松問答</span>
        </header>
        {children}
      </body>
    </html>
  );
}
