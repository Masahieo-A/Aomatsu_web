import { DATA_LAST_UPDATED } from "@/lib/data";

export default function Footer() {
  return (
    <footer className="print:hidden sticky bottom-0 z-20 border-t border-zinc-300 bg-yellow-50 px-4 py-2 text-xs text-zinc-700">
      本画面は要項の抜粋です。出願前に必ず要項原本を確認してください。　データ最終更新日: {DATA_LAST_UPDATED}
    </footer>
  );
}
