"use client";
// 「記事を探す」。キーワード（英語・日本語）と立場で絞り込む
import Link from "next/link";
import { useMemo, useState } from "react";
import SideBadge from "@/components/SideBadge";
import { ARTICLES, getPoint } from "@/lib/content";
import type { Article, Side } from "@/lib/types";

type SideFilter = "all" | Side;

// 検索対象: 見出し（英・日）、内容の要約、論点、語注、本文（3レベルすべて）
function haystack(a: Article): string {
  const points = [a.point, ...a.cardPoints].map((id) => {
    const p = getPoint(id);
    return p ? `${p.en} ${p.ja}` : "";
  });
  const gloss = a.glossary.map((g) => `${g.word} ${(g.forms ?? []).join(" ")} ${g.ja}`);
  const body = Object.values(a.levels).flatMap((lv) => lv.paragraphs.map((p) => p.text.replace(/\{\{hidden:\d+\}\}/g, "")));
  return [a.hookTitle, a.hookTitleJa, a.summaryJa, ...points, ...gloss, ...body].join(" ").toLowerCase();
}

const INDEX = ARTICLES.map((a) => ({ a, text: haystack(a) }));

export default function ArticleSearch() {
  const [q, setQ] = useState("");
  const [side, setSide] = useState<SideFilter>("all");

  const results = useMemo(() => {
    const words = q.toLowerCase().split(/[\s　]+/).filter(Boolean);
    return INDEX.filter(({ a, text }) => (side === "all" || a.side === side) && words.every((w) => text.includes(w))).map(
      ({ a }) => a,
    );
  }, [q, side]);

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
      <p className="muted mb-3">キーワードは英語でも日本語でも探せます（例：sushi、介護、細菌）。</p>

      <label htmlFor="q" className="field-label">
        キーワード
      </label>
      <input
        id="q"
        type="search"
        className="field"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="例：NASA、食品ロス、safety"
      />

      <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="立場で絞り込む">
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

      <p className="muted mt-4 mb-2">{results.length}件</p>
      {results.length === 0 ? (
        <p className="text-sm">見つかりませんでした。キーワードを変えるか、絞り込みを「すべて」に戻してください。</p>
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
