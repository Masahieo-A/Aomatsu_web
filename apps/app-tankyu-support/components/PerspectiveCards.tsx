"use client";

import { useId } from "react";

function clsx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function toneClasses(tone: "green" | "blue" | "amber" | "slate") {
  switch (tone) {
    case "green":
      return { head: "bg-[#2d6a4f] text-white", card: "border-[#52b788] bg-[#d8f3dc]" };
    case "blue":
      return { head: "bg-sky-600 text-white", card: "border-sky-200 bg-sky-50" };
    case "amber":
      return { head: "bg-amber-600 text-white", card: "border-amber-200 bg-amber-50" };
    case "slate":
    default:
      return { head: "bg-[#1a1714] text-white", card: "border-[#e2ddd8] bg-[#f8f7f4]" };
  }
}

export function PerspectiveCards({
  title,
  sections,
  onPick,
  disabled
}: {
  title?: string;
  sections: Array<{
    title: string;
    displayTitle?: string;
    items: Array<{ label: string; sendValue: string; tooltip: string }>;
    tone?: "green" | "blue" | "amber" | "slate";
  }>;
  onPick: (sendValue: string) => void;
  disabled: boolean;
}) {
  const panelId = useId();

  return (
    <div className="flex flex-col gap-3">
      {title ? (
        <div className="rounded-[10px] border border-[#e2ddd8] bg-white p-3 text-[15px] leading-7 text-[#1a1714] shadow-sm">
          {title}
        </div>
      ) : null}

      <div className="grid gap-3">
        {sections.map((sec, sIdx) => {
          const tone = sec.tone ?? "slate";
          const t = toneClasses(tone);
          return (
            <section
              key={`${sec.title}-${sIdx}`}
              className={clsx("overflow-hidden rounded-[10px] border shadow-sm", t.card)}
              aria-labelledby={`${panelId}-${sIdx}`}
            >
              <div className={clsx("px-3 py-2", t.head)} id={`${panelId}-${sIdx}`}>
                <div className="text-sm font-extrabold tracking-wide">
                  {sec.displayTitle ?? sec.title}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-3">
                {sec.items.map((it, iIdx) => {
                  const key = `${sIdx}-${iIdx}`;

                  return (
                    <button
                      key={key}
                      type="button"
                      disabled={disabled}
                      onClick={() => onPick(it.sendValue)}
                      className={clsx(
                        "w-full rounded-[10px] border border-white/60 bg-white/80 p-3 text-left shadow-sm transition",
                        "enabled:hover:bg-white enabled:hover:shadow",
                        "disabled:opacity-50"
                      )}
                    >
                      <div className="text-sm font-bold leading-relaxed text-[#1a1714]">
                        <span className="whitespace-pre-wrap break-words">{it.label}</span>
                      </div>
                      <div className="mt-2 text-xs text-[#6b645c]">タップしてこの視点で進む</div>
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
