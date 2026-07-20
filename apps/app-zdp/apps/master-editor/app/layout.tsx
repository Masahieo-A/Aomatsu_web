import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "文法項目マスタ管理",
  description: "grammar_master.json を作成・検証・育成する開発者用ツール",
};

const nav = [
  { href: "/", label: "ダッシュボード" },
  { href: "/items/new", label: "新規項目" },
  { href: "/memo", label: "クイックメモ" },
  { href: "/testbench", label: "テストベンチ" },
  { href: "/graph", label: "前提グラフ" },
];

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>
        <div className="border-b border-slate-200 bg-white">
          <div className="wrap flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
            <span className="font-bold text-brand">文法マスタ管理</span>
            {nav.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="text-sm text-slate-600 hover:text-brand"
              >
                {n.label}
              </Link>
            ))}
          </div>
        </div>
        {children}
      </body>
    </html>
  );
}
