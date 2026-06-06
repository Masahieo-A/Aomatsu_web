import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";

import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "英作文 文法添削 | English Hub",
  description: "日本の高校生向け英作文の文法添削（ヒント型）",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen antialiased`}
      >
        {/* ===== サイト共通ヘッダー ===== */}
        <header className="sticky top-0 z-50 flex h-[52px] items-center gap-3 border-b border-[#e2ddd8] bg-white px-5">
          <Link
            href="/"
            className="flex items-center gap-2 font-bold text-[15px] text-[#1a1714] no-underline"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] bg-[#2d6a4f] text-sm text-white">
              🌿
            </span>
            English Hub
          </Link>
          <span className="text-[#e2ddd8]">›</span>
          <span className="text-sm font-semibold text-[#1a1714]">
            英作文 文法添削
          </span>
        </header>

        {children}
        <Toaster position="top-center" richColors closeButton />
      </body>
    </html>
  );
}
