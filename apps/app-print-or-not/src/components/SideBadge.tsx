import type { Side } from "@/lib/types";
import { SIDE_LABEL } from "@/lib/content";

// 賛成＝青▲／反対＝橙■。色だけで区別しないよう記号と文字を必ず付ける
export default function SideBadge({ side, lang = "both" }: { side: Side; lang?: "en" | "ja" | "both" }) {
  const l = SIDE_LABEL[side];
  const cls = side === "pro" ? "border-pro text-pro bg-pro-dim" : "border-con text-con bg-con-dim";
  const text = lang === "en" ? l.en : lang === "ja" ? l.ja : `${l.en}（${l.ja}）`;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold ${cls}`}>
      <span aria-hidden>{l.icon}</span>
      {text}
    </span>
  );
}
