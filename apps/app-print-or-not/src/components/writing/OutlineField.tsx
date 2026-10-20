"use client";
// アウトライン1段分。Card を選べる段は、選んだ Card の下敷きをメモ欄の下に出す。
import type { EvidenceCard } from "@/lib/types";
import { getArticle, getPoint } from "@/lib/content";

interface Props {
  label: string;
  hint: string;
  memo: string;
  onMemo: (v: string) => void;
  // 以下は Card を選ぶ段だけ
  cards?: EvidenceCard[];
  cardId?: string;
  onCard?: (articleId: string) => void;
}

function cardLabel(c: EvidenceCard): string {
  const point = getPoint(c.point)?.en ?? c.point;
  const fact = c.fact.length > 36 ? `${c.fact.slice(0, 36)}…` : c.fact;
  return `${point}：${fact}`;
}

export default function OutlineField({ label, hint, memo, onMemo, cards, cardId, onCard }: Props) {
  const selected = cards?.find((c) => c.articleId === cardId);
  const source = selected ? getArticle(selected.articleId)?.sources[0] : undefined;
  const id = `outline-${label.replace(/\W+/g, "-")}`;

  return (
    <div className="box">
      <h3 className="section-title">{label}</h3>
      {cards && onCard && (
        <div className="mb-2">
          <label className="field-label" htmlFor={`${id}-card`}>
            使う Evidence Card
          </label>
          <select id={`${id}-card`} className="field min-h-11" value={cardId ?? ""} onChange={(e) => onCard(e.target.value)}>
            <option value="">選ばない</option>
            {cards.map((c) => (
              <option key={c.articleId} value={c.articleId}>
                {cardLabel(c)}
              </option>
            ))}
          </select>
        </div>
      )}
      <label className="field-label" htmlFor={`${id}-memo`}>
        {hint}
      </label>
      <textarea
        id={`${id}-memo`}
        className="field"
        rows={2}
        value={memo}
        onChange={(e) => onMemo(e.target.value)}
      />
      {selected && (
        <div className="mt-2 rounded-lg border border-dashed border-line p-3 text-sm text-muted">
          <p className="mb-1 font-semibold">下敷き：そのまま本文にしない</p>
          <dl className="space-y-1">
            <Row term="Fact" value={selected.fact} />
            <Row term="Number / Example" value={selected.numberExample} />
            <Row term="So what?" value={selected.soWhat} />
            <Row term="Source" value={source ? `${source.publisher}（${source.date}）` : ""} />
          </dl>
        </div>
      )}
    </div>
  );
}

function Row({ term, value }: { term: string; value: string }) {
  return (
    <div>
      <dt className="inline font-semibold">{term}：</dt>
      <dd className="inline">{value || "（未記入）"}</dd>
    </div>
  );
}
