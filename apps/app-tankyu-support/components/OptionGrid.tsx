"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

function clsx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function truncate(s: string, max = 26) {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function InfoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm.75 15h-1.5v-6h1.5Zm0-8h-1.5V7h1.5Z"
      />
    </svg>
  );
}

type PopoverState = {
  key: string;
  idx: number;
  fullText: string;
  anchor: HTMLButtonElement;
} | null;

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function OptionGrid({
  title,
  options,
  onPick,
  disabled
}: {
  title?: string;
  options: Array<{ label: string; sendValue: string; tooltip?: string }>;
  onPick: (sendValue: string) => void;
  disabled: boolean;
}) {
  const panelId = useId();
  const [open, setOpen] = useState<PopoverState>(null);
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // Escで閉じる
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const popoverPos = useMemo(() => {
    if (!open) return null;
    const rect = open.anchor.getBoundingClientRect();
    const gap = 10;
    const maxW = Math.min(560, Math.max(280, window.innerWidth * 0.8));
    const left = clamp(rect.left, 12, window.innerWidth - 12 - maxW);
    const top = clamp(rect.bottom + gap, 12, window.innerHeight - 12);
    return { left, top, width: maxW };
  }, [open]);

  return (
    <div className="flex flex-col gap-3">
      {title ? <div className="text-[15px] leading-6 text-[#1a1714]">{title}</div> : null}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {options.map((opt, idx) => {
          const key = `${opt.sendValue}-${idx}`;
          const fullText = opt.tooltip?.trim() ? opt.tooltip : opt.label;
          const truncated = truncate(opt.label);
          const needsInfo = Boolean(opt.tooltip) || truncated !== opt.label;

          return (
            <div key={key} className="relative">
              <button
                type="button"
                disabled={disabled}
                onClick={() => onPick(opt.sendValue)}
                className={clsx(
                  "group w-full rounded-[10px] border border-[#e2ddd8] bg-white px-3 py-3 text-left shadow-sm transition",
                  "enabled:hover:border-[#52b788] enabled:hover:bg-[#d8f3dc]",
                  "disabled:opacity-50"
                )}
              >
                <div className="pr-6 text-sm font-semibold text-[#1a1714] group-enabled:group-hover:text-[#1f5238]">
                  {truncated}
                </div>
                <div className="mt-1 text-xs text-[#6b645c]">タップして送信</div>
              </button>

              {needsInfo ? (
                <button
                  type="button"
                  disabled={disabled}
                  onClick={(e) => {
                    e.stopPropagation();
                    const el = e.currentTarget as HTMLButtonElement;
                    setOpen((prev) => (prev?.key === key ? null : { key, idx, fullText, anchor: el }));
                  }}
                  className={clsx(
                    "absolute right-2 top-2 rounded-lg bg-white/80 p-1 text-[#6b645c] shadow-sm transition",
                    "enabled:hover:bg-white enabled:hover:text-[#1a1714]",
                    "disabled:opacity-50"
                  )}
                  aria-label="全文を表示"
                >
                  <InfoIcon />
                </button>
              ) : null}
            </div>
          );
        })}
      </div>

      {mounted.current && open && popoverPos
        ? createPortal(
            <div className="fixed inset-0 z-[9998]" onMouseDown={() => setOpen(null)}>
              <div
                id={`${panelId}-${open.idx}`}
                className="fixed z-[9999] rounded-[10px] border border-[#e2ddd8] bg-white p-3 text-sm leading-7 text-[#1a1714] shadow-2xl"
                style={{ left: popoverPos.left, top: popoverPos.top, width: popoverPos.width }}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <div className="whitespace-pre-wrap break-words">{open.fullText}</div>
                <button
                  type="button"
                  onClick={() => setOpen(null)}
                  className="mt-2 w-full rounded-lg border border-[#e2ddd8] bg-[#f8f7f4] py-2 text-xs font-semibold text-[#1a1714] hover:bg-[#f1efe9]"
                >
                  閉じる
                </button>
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}

