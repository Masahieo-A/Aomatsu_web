"use client";
// S1 Hook（任意）: 本物 or 印刷？（写真が設定されている場合のみ）→ True or False → 立場メーター（初期）
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import RequireStudent from "@/components/RequireStudent";
import JaToggle from "@/components/card/JaToggle";
import StanceMeter, { stanceText } from "@/components/StanceMeter";
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
const TF_LABEL: Record<string, string> = { True: "True（正しい）", False: "False（まちがい）" };

export default function HookPage() {
  return <RequireStudent>{(s) => <Hook s={s} />}</RequireStudent>;
}

function Hook({ s }: { s: StudentState }) {
  const { update } = useStudent();
  const router = useRouter();
  const [photoPick, setPhotoPick] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>(s.hookAnswers);
  const [stance, setStance] = useState<number | undefined>(s.stanceBefore);
  // 最初の立場はトップ画面でも選べる。記録済みなら、ここでは変えない
  const stanceLocked = s.stanceBefore !== undefined;
  const answersLocked = s.hookDone;

  const tfDone = hook.trueFalse.every((q) => answers[q.id]);
  const canFinish = tfDone && stance !== undefined;

  const finish = () => {
    if (!canFinish) return;
    if (!answersLocked) {
      // 立場は読み直した最新の状態を優先し、記録済みなら上書きしない
      update((cur) => ({ ...cur, hookAnswers: answers, stanceBefore: cur.stanceBefore ?? stance, hookDone: true }));
    }
    router.push("/");
  };

  return (
    <div className="page space-y-6">
      <header>
        <h1 className="page-title">Warm-up（ウォームアップ）</h1>
        <p className="muted">
          記事を読む前に、3Dプリント食品についての予想と、今の考えを確かめます。この画面は任意です。飛ばして記事を読んでもかまいません。
        </p>
      </header>

      {PHOTOS.length > 0 && (
        <section className="box">
          <h2 className="section-title">Real or printed?（本物か、プリントか）</h2>
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
        <h2 className="section-title">True or False?（正しいか、まちがいか）</h2>
        <p className="muted mb-3">英文を読んで、正しいと思えば True、まちがいだと思えば False を選びます。直感でかまいません。答えは記事の中にあります。</p>
        <ol className="space-y-4">
          {hook.trueFalse.map((q, i) => (
            <li key={q.id}>
              <p className="mb-1" lang="en">
                {i + 1}. {q.statement}
              </p>
              <JaToggle ja={q.ja} />
              <div className="mt-2 flex flex-wrap gap-2">
                {["True", "False"].map((v) => (
                  <button
                    key={v}
                    type="button"
                    disabled={answersLocked}
                    className={answers[q.id] === v ? "btn" : "btn-secondary"}
                    aria-pressed={answers[q.id] === v}
                    onClick={() => setAnswers({ ...answers, [q.id]: v })}
                  >
                    {answers[q.id] === v && "✓ "}
                    {TF_LABEL[v]}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ol>
        {tfDone && <p className="mt-3 text-sm font-semibold">答えは記事の中。</p>}
      </section>

      <section className="box">
        <h2 className="section-title">Your stance now（今の立場）</h2>
        <p className="muted mb-3">3Dプリント食品は、広めるべきか、制限すべきか。理由は書かずに、今の直感で選びます。</p>
        <StanceMeter name="before" value={stance} onChange={setStance} disabled={stanceLocked} />
        {stanceLocked && (
          <p className="mt-2 text-sm">
            <span className="font-semibold">記録済み：{stanceText(s.stanceBefore)}</span>
            <span className="muted block">読んだ後に Stance Check（立場の確認）で選び直せます。</span>
          </p>
        )}
      </section>

      <div className="flex flex-wrap gap-2">
        <button className="btn flex-1" disabled={!canFinish} onClick={finish}>
          記事一覧へ
        </button>
        <Link href="/" className="btn-secondary">
          記事一覧に戻る
        </Link>
      </div>
    </div>
  );
}
