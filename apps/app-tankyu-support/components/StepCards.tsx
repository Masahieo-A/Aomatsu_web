"use client";

function clsx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

export function StepCards({
  title,
  steps,
  activeIndex
}: {
  title?: string;
  steps: Array<{ title: string; body?: string }>;
  activeIndex?: number;
}) {
  const current = Math.min(Math.max(activeIndex ?? 0, 0), Math.max(steps.length - 1, 0));

  return (
    <div className="flex flex-col gap-3">
      {title ? <div className="text-[15px] leading-6 text-[#1a1714]">{title}</div> : null}

      <div className="flex items-center gap-2">
        {steps.map((_, i) => (
          <div
            key={i}
            className={clsx(
              "h-2 flex-1 rounded-full",
              i <= current ? "bg-[#2d6a4f]" : "bg-[#e2ddd8]"
            )}
          />
        ))}
      </div>

      <div className="grid gap-2">
        {steps.map((s, i) => (
          <div
            key={`${s.title}-${i}`}
            className={clsx(
              "rounded-[10px] border bg-white p-3 shadow-sm",
              i === current ? "border-[#52b788]" : "border-[#e2ddd8]"
            )}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-bold text-[#1a1714]">{s.title}</div>
              <div className="text-xs text-[#6b645c]">
                {i + 1}/{steps.length}
              </div>
            </div>
            {s.body ? <div className="mt-2 whitespace-pre-wrap text-sm text-[#1a1714]">{s.body}</div> : null}
          </div>
        ))}
      </div>
    </div>
  );
}

