"use client";
// 「記事を探す」。立場と論点で絞り込む
import Link from "next/link";
import { useMemo, useState } from "react";
import SideBadge from "@/components/SideBadge";
import { ARTICLES, getPoint } from "@/lib/content";
import type { Article, Side } from "@/lib/types";

type SideFilter = "all" | Side;

// 記事に出てくる論点だけを選択肢にする
const POINT_OPTIONS = [...new Set(ARTICLES.flatMap((a) => [a.point, ...a.cardPoints]))]
  .map((id) => getPoint(id))
  .filter((p) => p !== undefined);

export default function ArticleSearch() {
  const [side, setSide] = useState<SideFilter>("all");
  const [point, setPoint] = useState("");

  const results = useMemo(
    () =>
      ARTICLES.filter(
        (a) => (side === "all" || a.side === side) && (!point || a.point === point || a.cardPoints.includes(point)),
      ),
    [side, point],
  );

  const sideChips: { v: SideFilter; label: string }[] = [
    { v: "all", label: "すべて" },
    { v: "pro", label: "▲ 広めるべき" },
    { v: "con", label: "■ 制限すべき" },
  ];

  return (
    <section className="box" aria-labelledby="search-title">
      <h2 id="search-title" className="section-title">
        記事を探す <span className="text-sm font-normal text-muted">Find articles</span>
      </h2>
      <p className="muted mb-3">立場や論点で絞り込めます。</p>

      <div className="flex flex-wrap gap-2" role="group" aria-label="立場で絞り込む">
        {sideChips.map((c) => (
          <button
            key={c.v}
            type="button"
            aria-pressed={side === c.v}
            onClick={() => setSide(c.v)}
            className={side === c.v ? "btn-small border-accent bg-accent-dim font-semibold" : "btn-small"}
          >
            {side === c.v && "✓ "}
            {c.label}
          </button>
        ))}
      </div>

      <div className="mt-3">
        <label htmlFor="point" className="field-label">
          論点で絞り込む
        </label>
        <select id="point" className="field" value={point} onChange={(e) => setPoint(e.target.value)}>
          <option value="">すべての論点</option>
          {POINT_OPTIONS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.ja}
            </option>
          ))}
        </select>
      </div>

      <p className="muted mt-4 mb-2">{results.length}件</p>
      {results.length === 0 ? (
        <p className="text-sm">見つかりませんでした。絞り込みを「すべて」に戻してください。</p>
      ) : (
        <ul className="space-y-3">
          {results.map((a) => (
            <ResultCard key={a.id} a={a} />
          ))}
        </ul>
      )}
    </section>
  );
}

function ResultCard({ a }: { a: Article }) {
  return (
    <li
      className={`rounded-[10px] border border-line bg-white p-4 ${a.side === "pro" ? "border-l-4 border-l-pro" : "border-l-4 border-l-con"}`}
    >
      <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-muted">
        <SideBadge side={a.side} lang="ja" />
        <span>約{a.minutes}分</span>
      </div>
      <p className="font-semibold leading-snug">{a.hookTitle}</p>
      <p className="text-sm leading-snug text-muted">{a.hookTitleJa}</p>
      <p className="mt-2 text-sm">{a.summaryJa}</p>
      <Link href={`/read/${a.id}`} className="btn mt-3">
        読む
      </Link>
    </li>
  );
}
