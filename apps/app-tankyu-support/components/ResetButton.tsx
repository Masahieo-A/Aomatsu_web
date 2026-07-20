"use client";

export function ResetButton({ onReset, disabled }: { onReset: () => void; disabled: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        const ok = window.confirm("会話を最初からやり直します。よろしいですか？");
        if (ok) onReset();
      }}
      className="rounded-lg border border-[#e2ddd8] bg-white px-3 py-2 text-[14px] font-semibold text-[#1a1714] shadow-sm transition hover:bg-[#f8f7f4] disabled:opacity-50"
    >
      最初からやり直す
    </button>
  );
}

