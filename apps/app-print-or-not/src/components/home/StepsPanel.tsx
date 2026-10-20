"use client";
// 進め方（Steps）。記録が残る活動（立場・仕分け・立場の確認・英作文）だけ完了の印を付ける
import Link from "next/link";
import SideBadge from "@/components/SideBadge";
import StanceMeter, { stanceText } from "@/components/StanceMeter";
import { SIDE_LABEL } from "@/lib/content";
import { mySide } from "@/lib/progress";
import { useStudent } from "@/lib/store";
import type { Side, StudentState } from "@/lib/types";

function Mark({ done }: { done?: boolean }) {
  if (done === undefined) {
    return <span aria-hidden className="mt-0.5 h-6 w-6 shrink-0" />;
  }
  return (
    <span
      aria-label={done ? "完了" : "未完了"}
      className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${
        done ? "border-accent bg-accent text-white" : "border-line bg-white text-muted"
      }`}
    >
      {done ? "✓" : ""}
    </span>
  );
}

export default function StepsPanel({ s }: { s: StudentState }) {
  const { update } = useStudent();
  const side = mySide(s);

  return (
    <section className="box" aria-labelledby="steps-title">
      <h2 id="steps-title" className="section-title">
        進め方 <span className="text-sm font-normal text-muted">Steps</span>
      </h2>
      <ol className="space-y-4">
        <li className="flex gap-3">
          <Mark done={s.stanceBefore !== undefined} />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">1. 今の立場を選ぶ（直感でOK）</p>
            {s.stanceBefore === undefined ? (
              <div className="mt-2">
                <p className="muted mb-2">3Dプリント食品は、広めるべき？ 制限すべき？ 理由は書かなくてかまいません。</p>
                <StanceMeter name="before-home" value={undefined} onChange={(v) => update((cur) => ({ ...cur, stanceBefore: v }))} />
              </div>
            ) : (
              <div className="muted mt-1 space-y-1">
                <p>最初の立場：{stanceText(s.stanceBefore)}</p>
                {s.stanceAfter !== undefined && <p>今の立場：{stanceText(s.stanceAfter)}</p>}
              </div>
            )}
            {s.stanceBefore !== undefined && !side && (
              <div className="mt-2">
                <p className="mb-2 text-sm">「未決」を選んだので、まず読む側を選んでください（あとで変えられます）。</p>
                <div className="flex flex-wrap gap-2">
                  {(["pro", "con"] as Side[]).map((sd) => (
                    <button key={sd} type="button" className="btn-small" onClick={() => update((cur) => ({ ...cur, firstSide: sd }))}>
                      {SIDE_LABEL[sd].icon} {SIDE_LABEL[sd].ja}側から読む
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </li>

        <li className="flex gap-3">
          <Mark />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">2. 記事を読む</p>
            <p className="muted mt-1">自分の側の記事だけでなく、反対側の記事も読みます。上の「記事を探す」から選んでください。</p>
            {side && (
              <p className="mt-1 flex flex-wrap items-center gap-2 text-sm">
                自分の側：<SideBadge side={side} lang="ja" />
              </p>
            )}
          </div>
        </li>

        <li className="flex gap-3">
          <Mark done={s.sortDone} />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">
              3. <Link href="/sort">Emotion or Evidence?</Link>（感情論か、根拠ありか）
            </p>
            <p className="muted mt-1">8つの文を「感情論」と「根拠あり」に仕分けます。</p>
          </div>
        </li>

        <li className="flex gap-3">
          <Mark done={s.stanceAfter !== undefined} />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">
              4. <Link href="/stance">Stance Check</Link>（立場の確認）
            </p>
            <p className="muted mt-1">読んだあとの立場をもう一度選びます。最初との違いが分かります。</p>
          </div>
        </li>

        <li className="flex gap-3">
          <Mark done={!!s.draft?.completedAt} />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">
              5. <Link href="/write">Writing Builder</Link>（英作文の組み立て）
            </p>
            <p className="muted mt-1">アウトラインを作り、本文を書いて、Google Classroom に提出します。</p>
          </div>
        </li>
      </ol>

      <div className="mt-4 border-t border-line pt-3 text-sm">
        <p className="mb-1 font-semibold">任意の活動</p>
        <ul className="space-y-1">
          <li>
            <Link href="/hook">Warm-up</Link>（ウォームアップ：True or False クイズ）{s.hookDone && " ✓"}
          </li>
          <li>
            <Link href="/trap">Trap or Treasure?</Link>（使える根拠か、危ない根拠か）{s.trapDone && " ✓"}
          </li>
        </ul>
      </div>
    </section>
  );
}
