import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "口頭試問プリント生成ツール | English Hub",
  description:
    "生徒の英作文から個別の追随質問つき小テストプリントを自動生成するローカルWebアプリ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[#f8f7f4] text-[#1a1714]">
        {/* ===== ポータルへ戻る共通ヘッダー（印刷時は非表示） ===== */}
        <header className="no-print sticky top-0 z-50 flex h-[52px] items-center gap-3 border-b border-[#e2ddd8] bg-white px-5">
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
          <span className="text-sm font-semibold text-[#1a1714]">
            口頭試問プリント生成ツール
          </span>
        </header>
        {children}
      </body>
    </html>
  );
}
