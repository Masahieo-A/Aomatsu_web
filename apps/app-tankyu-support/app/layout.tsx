import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "探究ファシリテーターAI | English Hub",
  description: "地域探究のテーマ・問いづくりをAIがサポートします。"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="min-h-dvh bg-[#f8f7f4] text-[#1a1714]">
        {/* ===== サイト共通ヘッダー（ポータルへ戻る導線） ===== */}
        <header className="sticky top-0 z-50 flex h-[52px] items-center gap-3 border-b border-[#e2ddd8] bg-white px-5">
          <a
            href="https://aomatsu-english-portal.vercel.app"
            className="flex items-center gap-2 text-[15px] font-bold text-[#1a1714] no-underline"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] bg-[#2d6a4f] text-sm text-white">
              🌿
            </span>
            English Hub
          </a>
          <span className="text-[#e2ddd8]">›</span>
          <span className="text-sm font-semibold text-[#1a1714]">探究ファシリテーターAI</span>
        </header>

        <div className="mx-auto min-h-[calc(100dvh-52px)] max-w-3xl px-4 py-4 sm:py-8">
          {children}
        </div>
      </body>
    </html>
  );
}

