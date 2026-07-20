interface PortalHeaderProps {
  appName?: string;
}

/**
 * ポータル（English Hub）へ戻る共通ヘッダー。
 * design-system.md の規約に従い、全アプリ画面の左上に配置する。
 */
export function PortalHeader({ appName = "3Dルームビューアー" }: PortalHeaderProps) {
  return (
    <header className="sticky top-0 z-50 flex h-[52px] shrink-0 items-center gap-3 border-b border-[#e2ddd8] bg-white px-5">
      <a
        href="https://aomatsu-english-portal.vercel.app"
        className="flex items-center gap-2 text-[15px] font-bold text-[#1a1714] no-underline"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-[6px] bg-[#2d6a4f] text-sm text-white">
          🌿
        </span>
        English Hub
      </a>
      <span style={{ color: "#e2ddd8" }}>›</span>
      <span className="text-sm font-semibold text-[#1a1714]">{appName}</span>
    </header>
  );
}
