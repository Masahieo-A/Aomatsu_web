import SideBadge from "@/components/SideBadge";
import { getArticle, getPoint } from "@/lib/content";
import type { DashStudent } from "./types";

function stanceText(before: number | null, after: number | null): string {
  return `前 ${before ?? "－"} → 後 ${after ?? "－"}`;
}

export default function StudentList({ students }: { students: DashStudent[] }) {
  if (students.length === 0) return <p className="muted">この条件のデータはまだありません。</p>;
  return (
    <div className="space-y-2">
      {students.map((s) => (
        <details key={s.number} className="box !p-0">
          <summary className="flex min-h-11 cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 text-sm">
            <span className="font-bold">{s.number}番</span>
            <span>{stanceText(s.stanceBefore, s.stanceAfter)}</span>
            <span>Card {s.cardCount}枚</span>
            {s.cardCount > 0 && s.soWhatCount < s.cardCount && (
              <span className="font-semibold text-red-700">So what 未記入 {s.cardCount - s.soWhatCount}枚</span>
            )}
          </summary>
          <div className="space-y-3 border-t border-line px-4 py-3">
            {s.cards.length === 0 && <p className="muted">Card はまだありません。</p>}
            {s.cards.map((c) => (
              <div key={c.articleId} className="space-y-1 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <SideBadge side={c.side} lang="en" />
                  <span className="font-semibold">{c.articleId}</span>
                  <span className="muted">{getArticle(c.articleId)?.hookTitle}</span>
                </div>
                <p>
                  <span className="font-semibold">Point: </span>
                  {getPoint(c.point)?.ja ?? c.point}
                </p>
                <p>
                  <span className="font-semibold">Fact: </span>
                  {c.fact}
                </p>
                <p>
                  <span className="font-semibold">So what: </span>
                  {c.hasSoWhat ? c.soWhat : <span className="font-semibold text-red-700">✗ 未記入</span>}
                </p>
                <p>
                  <span className="font-semibold">Weak point: </span>
                  {c.weakPoint || <span className="text-muted">なし</span>}
                </p>
              </div>
            ))}
          </div>
        </details>
      ))}
    </div>
  );
}
