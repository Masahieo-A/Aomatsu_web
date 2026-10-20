import Link from "next/link";

export default function AppHeader() {
  return (
    <header className="sticky top-0 z-50 flex h-[52px] items-center gap-3 border-b border-line bg-white px-4">
      <a
        href="https://aomatsu-english-portal.vercel.app"
        className="flex shrink-0 items-center gap-2 text-[15px] font-bold text-ink no-underline"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-[6px] bg-accent text-sm text-white">🌿</span>
        <span className="hidden sm:inline">English Hub</span>
      </a>
      <span className="text-line">›</span>
      <Link href="/" className="truncate text-sm font-semibold text-ink no-underline">
        PRINT or NOT?
      </Link>
    </header>
  );
}
