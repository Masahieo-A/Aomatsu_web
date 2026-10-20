"use client";
// 英文の「日本語訳」ボタン。押すと訳を表示し、もう一度押すと閉じる。
import { useId, useState } from "react";

export default function JaToggle({ ja, label = "日本語訳" }: { ja: string; label?: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <div className="mt-1">
      <button
        type="button"
        className="btn-small min-h-11"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
      >
        {open ? `${label}を閉じる` : label}
      </button>
      {open && (
        <p id={id} lang="ja" className="mt-2 border-l-4 border-line pl-3 text-base leading-[1.7]">
          {ja}
        </p>
      )}
    </div>
  );
}
