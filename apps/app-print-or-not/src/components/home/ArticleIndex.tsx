// 右側の「全記事一覧」。賛成・反対に分け、読了・Card の状態を添える
import Link from "next/link";
import SideBadge from "@/components/SideBadge";
import { articlesBySide } from "@/lib/content";
import type { Side, StudentState } from "@/lib/types";

export default function ArticleIndex({ s, mySide }: { s: StudentState; mySide?: Side }) {
  const order: Side[] = mySide === "con" ? ["con", "pro"] : ["pro", "con"];
  return (
    <section className="box" aria-labelledby="index-title">
      <h2 id="index-title" className="section-title">
        全記事一覧 <span className="text-sm font-normal text-muted">All articles（8本）</span>
      </h2>
      {order.map((side) => (
        <div key={side} className="mt-3">
          <p className="mb-1 flex items-center gap-2 text-xs">
            <SideBadge side={side} />
            {mySide && <span className="text-muted">{side === mySide ? "自分の側" : "反対側"}</span>}
          </p>
          <ul className="divide-y divide-line">
            {articlesBySide(side).map((a) => {
              const read = s.readArticles.includes(a.id);
              const card = !!s.cards[a.id];
              return (
                <li key={a.id}>
                  <Link href={`/read/${a.id}`} className="block py-2 text-ink no-underline hover:text-accent-strong">
                    <span className="block text-sm font-semibold leading-snug">{a.hookTitle}</span>
                    <span className="block text-xs leading-snug text-muted">{a.hookTitleJa}</span>
                    <span className="mt-0.5 block text-xs text-muted">
                      {read ? "✓ 読了" : "未読"}・{card ? "✓ Card" : "Card なし"}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </section>
  );
}
