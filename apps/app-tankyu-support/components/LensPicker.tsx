"use client";

import { useId, useState } from "react";

function clsx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function MatrixMini() {
  return (
    <div className="rounded-[10px] border border-[#e2ddd8] bg-white p-3 shadow-sm">
      <div className="text-sm font-extrabold text-[#1a1714]">いま探しているのは「交差点」</div>
      <div className="mt-1 text-sm leading-7 text-[#1a1714]">
        1つ目（X軸）で選んだテーマに、2つ目（Y軸）のレンズをかけると、<b>新しい問い</b>が生まれます。
        次は「どのレンズで見るか」を選ぼう。
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
        <div className="rounded-lg bg-[#f1efe9] p-2 text-center font-semibold text-[#1a1714]">X軸：テーマ</div>
        <div className="rounded-lg bg-[#f1efe9] p-2 text-center font-semibold text-[#1a1714]">×</div>
        <div className="rounded-lg bg-[#f1efe9] p-2 text-center font-semibold text-[#1a1714]">Y軸：レンズ</div>
        <div className="col-span-3 rounded-lg border border-[#52b788] bg-[#d8f3dc] p-2 text-center font-bold text-[#1f5238]">
          交差点 → 探究の問い
        </div>
      </div>
    </div>
  );
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

export function LensPicker({
  title,
  lenses,
  onPick,
  disabled
}: {
  title?: string;
  lenses: Array<{ label: string; sendValue: string; tooltip?: string }>;
  onPick: (sendValue: string) => void;
  disabled: boolean;
}) {
  const panelId = useId();
  const [openKey, setOpenKey] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-3">
      <MatrixMini />

      {title ? (
        <div className="rounded-[10px] border border-[#e2ddd8] bg-white p-3 text-[15px] leading-7 text-[#1a1714] shadow-sm">
          {title}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {lenses.map((l, idx) => {
          const key = `${l.sendValue}-${idx}`;
          const isOpen = openKey === key;
          const fullText = l.tooltip?.trim() ? l.tooltip : l.label;
          const hasInfo = Boolean(l.tooltip);

          return (
            <div key={key} className="relative">
              <button
                type="button"
                disabled={disabled}
                onClick={() => onPick(l.sendValue)}
                className={clsx(
                  "inline-flex items-center gap-2 rounded-full border border-[#e2ddd8] bg-white px-4 py-2 text-sm font-extrabold text-[#1a1714] shadow-sm transition",
                  "enabled:hover:border-[#52b788] enabled:hover:bg-[#d8f3dc]",
                  "disabled:opacity-50"
                )}
                aria-describedby={hasInfo && isOpen ? `${panelId}-${idx}` : undefined}
              >
                <span>{l.label}</span>
              </button>

              {hasInfo ? (
                <button
                  type="button"
                  disabled={disabled}
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenKey((prev) => (prev === key ? null : key));
                  }}
                  className={clsx(
                    "absolute -right-2 -top-2 rounded-lg bg-white/90 p-1 text-[#6b645c] shadow-sm transition",
                    "enabled:hover:bg-white enabled:hover:text-[#1a1714]",
                    "disabled:opacity-50"
                  )}
                  aria-label="説明を表示"
                >
                  <InfoIcon />
                </button>
              ) : null}

              {hasInfo && isOpen ? (
                <div
                  id={`${panelId}-${idx}`}
                  className="absolute left-0 top-[calc(100%+8px)] z-[9999] w-[min(22rem,80vw)] rounded-[10px] border border-[#e2ddd8] bg-white p-3 text-sm leading-7 text-[#1a1714] shadow-xl"
                >
                  <div className="whitespace-pre-wrap break-words">{fullText}</div>
                  <button
                    type="button"
                    onClick={() => setOpenKey(null)}
                    className="mt-2 w-full rounded-lg border border-[#e2ddd8] bg-[#f8f7f4] py-2 text-xs font-semibold text-[#1a1714] hover:bg-[#f1efe9]"
                  >
                    閉じる
                  </button>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

