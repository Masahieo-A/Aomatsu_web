import type { Metadata } from "next"
import "./globals.css"
import { SessionProvider } from "next-auth/react"

export const metadata: Metadata = {
  title: "未来の図書館 | Future Library Generator",
  description:
    "あなたが理想とする未来の図書館の1フロアをAIで画像生成するツールです。",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body className="min-h-screen bg-gray-50 antialiased">
        {/* ===== English Hub 共通ヘッダー（ポータルへ戻る導線） ===== */}
        <header className="sticky top-0 z-[60] flex h-[52px] items-center gap-3 border-b border-[#e2ddd8] bg-white px-5">
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
          <span className="text-sm font-semibold text-[#1a1714]">未来の図書館</span>
        </header>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  )
}
