"use client";
// F3-6 本文中の3文を「事実／意見」に分ける。全部答えたら正誤と理由を出す。
import { useState } from "react";
import { useStudent } from "@/lib/store";
import type { Article } from "@/lib/types";

type Pick = "fact" | "opinion";

export default function FactOpinionBox({ article }: { article: Article }) {
  const { state, update } = useStudent();
  const items = article.factOpinion;
  const saved = state?.factOpinionAnswers[article.id];
  const [picks, setPicks] = useState<(Pick | undefined)[]>(() => items.map((_, i) => saved?.[i]));

  if (items.length === 0) return null;
  const complete = picks.every((p) => p !== undefined);

  const choose = (i: number, v: Pick) => {
    if (complete) return;
    const next = picks.map((p, j) => (j === i ? v : p));
    setPicks(next);
    if (next.every((p) => p !== undefined)) {
      update((s) => ({ ...s, factOpinionAnswers: { ...s.factOpinionAnswers, [article.id]: next as Pick[] } }));
    }
  };

  return (
    <section className="box my-6">
      <h2 className="section-title">Fact or Opinion?</h2>
      <p className="muted mb-3">次の文は「事実」か「意見」か。</p>
      <ul className="space-y-4">
        {items.map((it, i) => {
          const p = picks[i];
          return (
            <li key={i}>
              <p className="mb-2">{it.sentence}</p>
              <div className="flex gap-2">
                {(["fact", "opinion"] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    aria-pressed={p === v}
                    onClick={() => choose(i, v)}
                    disabled={complete}
                    className={`min-h-11 flex-1 rounded-lg border px-3 py-2 text-[15px] ${
                      p === v ? "border-accent bg-accent-dim font-semibold" : "border-line bg-white"
                    } disabled:cursor-default`}
                  >
                    {p === v ? "✓ " : ""}
                    {v === "fact" ? "Fact（事実）" : "Opinion（意見）"}
                  </button>
                ))}
              </div>
              {complete && (
                <p className="mt-2 text-sm" role="status">
                  <b>{p === it.answer ? "✓ 正解" : `✗ 不正解（正解は ${it.answer === "fact" ? "Fact" : "Opinion"}）`}</b>
                  <span className="ml-1">{it.explain}</span>
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
