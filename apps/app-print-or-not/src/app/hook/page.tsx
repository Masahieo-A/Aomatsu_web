"use client";
// S1 Hook: 本物 or 印刷？（写真が設定されている場合のみ）→ True or False → 立場メーター（初期）
import { useState } from "react";
import { useRouter } from "next/navigation";
import RequireStudent from "@/components/RequireStudent";
import StanceMeter from "@/components/StanceMeter";
import { useStudent } from "@/lib/store";
import type { StudentState } from "@/lib/types";
import hook from "@/data/hook.json";

interface Photo {
  src: string;
  alt: string;
  printed: boolean;
  credit: string;
}

const PHOTOS = hook.photos as Photo[];

export default function HookPage() {
  return <RequireStudent>{(s) => <Hook s={s} />}</RequireStudent>;
}

function Hook({ s }: { s: StudentState }) {
  const { update } = useStudent();
  const router = useRouter();
  const [photoPick, setPhotoPick] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>(s.hookAnswers);
  const [stance, setStance] = useState<number | undefined>(s.stanceBefore);
  const locked = s.stanceBefore !== undefined && s.hookDone;

  const tfDone = hook.trueFalse.every((q) => answers[q.id]);
  const canFinish = tfDone && stance !== undefined;

  const finish = () => {
    if (!canFinish) return;
    if (!locked) {
      update((cur) => ({ ...cur, hookAnswers: answers, stanceBefore: stance, hookDone: true }));
    }
    router.push("/map");
  };

  return (
    <div className="page space-y-6">
      <h1 className="page-title">Warm-up</h1>

      {PHOTOS.length > 0 && (
        <section className="box">
          <h2 className="section-title">Real or printed?</h2>
          <p className="muted mb-3">3Dプリンタで作られた料理はどれ？ 1つ選んでください。</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {PHOTOS.map((p, i) => (
              <figure key={p.src} className="m-0">
                <button
                  type="button"
                  className={`block w-full overflow-hidden rounded-lg border-2 ${photoPick === i ? "border-accent" : "border-line"}`}
                  onClick={() => setPhotoPick(i)}
                  disabled={photoPick !== null}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.src} alt={p.alt} className="aspect-square w-full object-cover" />
                </button>
                <figcaption className="mt-1 text-xs text-muted">
                  {photoPick !== null && (
                    <strong className={p.printed ? "text-accent" : "text-ink"}>{p.printed ? "✓ Printed" : "Real"}　</strong>
                  )}
                  {p.credit}
                </figcaption>
              </figure>
            ))}
          </div>
          {photoPick !== null && (
            <p className="mt-3 text-sm">{PHOTOS[photoPick].printed ? "正解です。" : "不正解です。"}見た目だけでは見分けにくいことがあります。</p>
          )}
        </section>
      )}

      <section className="box">
        <h2 className="section-title">True or False?</h2>
        <p className="muted mb-3">直感で選んでください。答えは記事の中にあります。</p>
        <ol className="space-y-4">
          {hook.trueFalse.map((q, i) => (
            <li key={q.id}>
              <p className="mb-2">
                {i + 1}. {q.statement}
              </p>
              <div className="flex gap-2">
                {["True", "False"].map((v) => (
                  <button
                    key={v}
                    type="button"
                    disabled={locked}
                    className={answers[q.id] === v ? "btn" : "btn-secondary"}
                    aria-pressed={answers[q.id] === v}
                    onClick={() => setAnswers({ ...answers, [q.id]: v })}
                  >
                    {answers[q.id] === v && "✓ "}
                    {v}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ol>
        {tfDone && <p className="mt-3 text-sm font-semibold">答えは記事の中。</p>}
      </section>

      <section className="box">
        <h2 className="section-title">Your stance now</h2>
        <p className="muted mb-3">3Dプリント食品は広めるべき？ 制限すべき？ 理由は書かずに、今の直感で選んでください。</p>
        <StanceMeter name="before" value={stance} onChange={setStance} disabled={locked} />
        {locked && <p className="muted mt-2">最初の立場は記録済みです。読んだ後に Stance Check で選び直せます。</p>}
      </section>

      <button className="btn w-full" disabled={!canFinish} onClick={finish}>
        記事を選ぶ
      </button>
    </div>
  );
}
