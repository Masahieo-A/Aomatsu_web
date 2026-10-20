import type { Metadata, Viewport } from "next";
import "./globals.css";
import { StudentProvider } from "@/lib/store";
import AppHeader from "@/components/AppHeader";

export const metadata: Metadata = {
  title: "PRINT or NOT?",
  description: "3Dプリント食品 Writing 準備",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body>
        <StudentProvider>
          <AppHeader />
          <main>{children}</main>
        </StudentProvider>
      </body>
    </html>
  );
}
