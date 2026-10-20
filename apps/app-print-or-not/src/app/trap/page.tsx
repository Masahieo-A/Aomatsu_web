"use client";
// S5-2 Trap or Treasure?: 一見強そうな根拠6枚を「使える／危ない」で判定する
import Link from "next/link";
import { useState } from "react";
import RequireStudent from "@/components/RequireStudent";
import { useStudent } from "@/lib/store";
import type { StudentState } from "@/lib/types";
import cards from "@/data/trap.json";

type Verdict = "treasure" | "trap";

export default function TrapPage() {
  return <RequireStudent>{(s) => <Trap s={s} />}</RequireStudent>;
}

function Trap({ s }: { s: StudentState }) {
  const { update, settings } = useStudent();
  const [picks, setPicks] = useState<Record<string, Verdict>>(() =>
    s.trapDone ? Object.fromEntries(cards.map((c) => [c.id, c.answer as Verdict])) : {},
  );

  const pick = (id: string, v: Verdict) => {
    if (picks[id]) return; // 判定は1回だけ（答えを見てから選び直せないように）
    const next = { ...picks, [id]: v };
    setPicks(next);
    if (cards.every((c) => next[c.id])) update((cur) => ({ ...cur, trapDone: true }));
  };

  const done = cards.every((c) => picks[c.id]);
  const correct = cards.filter((c) => picks[c.id] === c.answer).length;

  return (
    <div className="page space-y-4">
      <h1 className="page-title">Trap or Treasure?</h1>
      <p className="muted">
        Writing で使えそうな根拠です。そのまま使える（Treasure）か、危ない（Trap）かを判定してください。
        {settings.trapRequired ? "" : "（任意）"}
      </p>
      <ol className="space-y-3">
        {cards.map((c, i) => {
          const p = picks[c.id];
          return (
            <li key={c.id} className="box">
              <p className="font-semibold">
                {i + 1}. {c.text}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {(["treasure", "trap"] as Verdict[]).map((v) => (
                  <button
                    key={v}
                    type="button"
                    disabled={!!p}
                    className={p === v ? "btn-small border-accent bg-accent-dim font-semibold" : "btn-small"}
                    onClick={() => pick(c.id, v)}
                  >
                    {p === v && "✓ "}
                    {v === "treasure" ? "Treasure（使える）" : "Trap（危ない）"}
                  </button>
                ))}
              </div>
              {p && (
                <div className="mt-3 space-y-2 border-t border-line pt-3 text-sm">
                  <p>
                    <span className={`font-semibold ${p === c.answer ? "text-accent" : "text-red-700"}`}>
                      {p === c.answer ? "○ 正解" : "× 不正解"}
                    </span>
                    ：{c.answer === "treasure" ? ("conditional" in c && c.conditional ? "条件つき Treasure" : "Treasure") : "Trap"}
                  </p>
                  <p>{c.why}</p>
                  <p>
                    <span className="font-semibold">こう書けば使える：</span>
                    <span lang="en">{c.rewrite}</span>
                  </p>
                </div>
              )}
            </li>
          );
        })}
      </ol>
      {done && (
        <div className="box">
          <p>
            {cards.length}問中 {correct}問 正解。Trap の書き直し例は、反対意見への反論（Rebuttal）にも使えます。
          </p>
          <Link href="/map" className="btn mt-3">
            Article Map に戻る
          </Link>
        </div>
      )}
    </div>
  );
}
