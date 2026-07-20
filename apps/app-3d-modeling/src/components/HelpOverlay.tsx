"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface HelpOverlayProps {
  className?: string;
}

export function HelpOverlay({ className }: HelpOverlayProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className={cn("absolute right-4 top-4 z-10", className)}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex h-10 w-10 items-center justify-center rounded-full border border-[#e2ddd8] bg-white/95 text-[#2d6a4f] shadow-md backdrop-blur transition hover:bg-[#d8f3dc]"
        aria-label="操作説明"
      >
        <span className="text-lg font-bold">?</span>
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-20 bg-black/40"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="absolute right-0 top-12 z-30 w-64 rounded-[10px] border border-[#e2ddd8] bg-white p-4 text-sm text-[#1a1714] shadow-xl">
            <h3 className="mb-2 font-semibold">操作説明</h3>
            <ul className="space-y-1 text-[#6b645c]">
              <li>・左ドラッグ：回転</li>
              <li>・右ドラッグ：パン</li>
              <li>・スクロール：ズーム</li>
            </ul>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-3 min-h-[40px] w-full rounded-lg bg-[#2d6a4f] py-2 text-xs font-semibold text-white transition hover:bg-[#1f5238]"
            >
              閉じる
            </button>
          </div>
        </>
      )}
    </div>
  );
}
