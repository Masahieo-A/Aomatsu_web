"use client";
// 左側の「記事を探す」。キーワード（英語・日本語）・側・論点・状態で絞り込む
import Link from "next/link";
import { useMemo, useState } from "react";
import SideBadge from "@/components/SideBadge";
import { ARTICLES, getPoint } from "@/lib/content";
import type { Article, Side, StudentState } from "@/lib/types";

type SideFilter = "all" | Side;
type StatusFilter = "all" | "unread" | "nocard";

// 検索対象: 見出し（英・日）、内容の要約、論点、語注、Lv1 本文
function haystack(a: Article): string {
  const points = [a.point, ...a.cardPoints].map((id) => {
    const p = getPoint(id);
    return p ? `${p.en} ${p.ja}` : "";
  });
  const gloss = a.glossary.map((g) => `${g.word} ${(g.forms ?? []).join(" ")} ${g.ja}`);
  const body = a.levels.lv1.paragraphs.map((p) => p.text.replace(/\{\{hidden:\d+\}\}/g, ""));
  return [a.hookTitle, a.hookTitleJa, a.summaryJa, ...points, ...gloss, ...body].join(" ").toLowerCase();
}

const INDEX = ARTICLES.map((a) => ({ a, text: haystack(a) }));

// 記事に出てくる論点だけを選択肢にする
const POINT_OPTIONS = [...new Set(ARTICLES.flatMap((a) => [a.point, ...a.cardPoints]))]
  .map((id) => getPoint(id))
  .filter((p) => p !== undefined);

export default function ArticleSearch({ s }: { s: StudentState }) {
  const [q, setQ] = useState("");
  const [side, setSide] = useState<SideFilter>("all");
  const [point, setPoint] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");

  const results = useMemo(() => {
    const words = q.toLowerCase().split(/[\s　]+/).filter(Boolean);
    return INDEX.filter(({ a, text }) => {
      if (side !== "all" && a.side !== side) return false;
      if (point && a.point !== point && !a.cardPoints.includes(point)) return false;
      if (status === "unread" && s.readArticles.includes(a.id)) return false;
      if (status === "nocard" && s.cards[a.id]) return false;
      return words.every((w) => text.includes(w));
    }).map(({ a }) => a);
  }, [q, side, point, status, s.readArticles, s.cards]);

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

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
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
        <div>
          <label htmlFor="status" className="field-label">
            読んだかどうか
          </label>
          <select id="status" className="field" value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)}>
            <option value="all">すべて</option>
            <option value="unread">まだ読んでいない記事</option>
            <option value="nocard">Card をまだ作っていない記事</option>
          </select>
        </div>
      </div>

      <p className="muted mt-4 mb-2">{results.length}件</p>
      {results.length === 0 ? (
        <p className="text-sm">見つかりませんでした。キーワードを変えるか、絞り込みを「すべて」に戻してください。</p>
      ) : (
        <ul className="space-y-3">
          {results.map((a) => (
            <ResultCard key={a.id} a={a} s={s} />
          ))}
        </ul>
      )}
    </section>
  );
}

function ResultCard({ a, s }: { a: Article; s: StudentState }) {
  const read = s.readArticles.includes(a.id);
  const card = !!s.cards[a.id];
  return (
    <li
      className={`rounded-[10px] border border-line bg-white p-4 ${a.side === "pro" ? "border-l-4 border-l-pro" : "border-l-4 border-l-con"}`}
    >
      <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-muted">
        <SideBadge side={a.side} lang="ja" />
        <span aria-label={`難易度 ${a.difficulty}`}>
          {"★".repeat(a.difficulty)}
          {"☆".repeat(3 - a.difficulty)}
        </span>
        <span>約{a.minutes}分</span>
        <span>{read ? "✓ 読了" : "未読"}</span>
        <span>{card ? "✓ Card" : "Card なし"}</span>
        {s.lv2Read.includes(a.id) && <span>Challenge ✓</span>}
      </div>
      <p className="font-semibold leading-snug">{a.hookTitle}</p>
      <p className="text-sm leading-snug text-muted">{a.hookTitleJa}</p>
      <p className="mt-2 text-sm">{a.summaryJa}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link href={`/read/${a.id}`} className="btn">
          {read ? "もう一度読む" : "読む"}
        </Link>
        {read && (
          <Link href={`/card/${a.id}`} className="btn-secondary">
            {card ? "Card を見直す" : "Card を作る"}
          </Link>
        )}
      </div>
    </li>
  );
}
