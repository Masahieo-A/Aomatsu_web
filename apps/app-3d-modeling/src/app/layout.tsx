import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "3Dルームビューアー | English Hub",
  description: "生徒が作成した部屋レイアウトを高品質な3Dで閲覧できるビューアー",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="antialiased">{children}</body>
    </html>
  );
}
