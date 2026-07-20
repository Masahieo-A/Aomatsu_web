"use client";

import { useEffect, useRef } from "react";

export function InputArea({
  value,
  onChange,
  onSend,
  disabled
}: {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  disabled: boolean;
}) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!disabled) {
      textareaRef.current?.focus();
    }
  }, [disabled]);

  const canSend = value.trim().length > 0 && !disabled;

  return (
    <div className="flex items-end gap-2 rounded-[10px] border border-[#e2ddd8] bg-white p-2 shadow-sm">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="ここに入力して送信"
        className="max-h-40 min-h-[44px] flex-1 resize-none rounded-lg bg-white px-3 py-2 text-[16px] leading-6 outline-none placeholder:text-[#8a8378] disabled:bg-[#f8f7f4]"
        disabled={disabled}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (canSend) onSend();
          }
        }}
      />
      <button
        type="button"
        onClick={onSend}
        disabled={!canSend}
        className="rounded-lg bg-[#2d6a4f] px-4 py-2 text-[15px] font-semibold text-white shadow-sm transition enabled:hover:bg-[#1f5238] disabled:opacity-40"
      >
        送信
      </button>
    </div>
  );
}

