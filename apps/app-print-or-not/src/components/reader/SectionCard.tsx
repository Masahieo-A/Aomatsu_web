// 記事画面のブロック共通の枠。左上に「日本語 英語」のラベルを置き、何のブロックか分かるようにする。
// quiz は枠を太い緑にして本文と見分ける（大きな色面は作らない）。
import type { ReactNode } from "react";

export default function SectionCard({
  ja,
  en,
  variant = "plain",
  id,
  className = "",
  children,
}: {
  ja: string;
  en: string;
  variant?: "plain" | "quiz";
  id?: string;
  className?: string;
  children: ReactNode;
}) {
  const frame = variant === "quiz" ? "border-2 border-accent" : "";
  const chip =
    variant === "quiz"
      ? "bg-accent-dim text-accent-strong"
      : "border border-line text-muted";
  return (
    <section
      id={id}
      aria-label={`${ja} ${en}`}
      className={`box ${frame} ${className}`}
    >
      <p
        className={`mb-3 inline-block rounded-md px-2 py-0.5 text-sm font-semibold ${chip}`}
      >
        {ja} <span className="font-normal">{en}</span>
      </p>
      {children}
    </section>
  );
}
