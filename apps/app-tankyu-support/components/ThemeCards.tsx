"use client";

import { useState } from "react";

function clsx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

export function ThemeCards({
  title,
  themes
}: {
  title?: string;
  themes: Array<{ title: string; body?: string }>;
}) {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <div className="flex flex-col gap-3">
      {title ? <div className="text-[15px] leading-6 text-[#1a1714]">{title}</div> : null}

      <div className="grid gap-2">
        {themes.map((t, idx) => {
          const isOpen = openIdx === idx;
          return (
            <button
              key={`${t.title}-${idx}`}
              type="button"
              onClick={() => setOpenIdx(isOpen ? null : idx)}
              className={clsx(
                "rounded-[10px] border border-[#e2ddd8] bg-white p-3 text-left shadow-sm transition",
                "hover:border-[#52b788] hover:bg-[#d8f3dc]"
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-bold text-[#1a1714]">{t.title}</div>
                <div className="text-xs text-[#6b645c]">{isOpen ? "閉じる" : "開く"}</div>
              </div>
              {isOpen && t.body ? (
                <div className="mt-2 whitespace-pre-wrap text-sm text-[#1a1714]">{t.body}</div>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

