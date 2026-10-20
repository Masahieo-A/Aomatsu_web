"use client";
// 進め方（Steps）。今どこまで進んだかと、Writing Builder が開く条件をまとめて見せる
import Link from "next/link";
import SideBadge from "@/components/SideBadge";
import StanceMeter, { stanceText } from "@/components/StanceMeter";
import { SIDE_LABEL } from "@/lib/content";
import { cardCounts, cardsRemaining, isWritingUnlocked, mySide, NEED_MINE, NEED_OTHER } from "@/lib/progress";
import { useStudent } from "@/lib/store";
import type { Side, StudentState } from "@/lib/types";

function Mark({ done }: { done: boolean }) {
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
  const { settings, update } = useStudent();
  const side = mySide(s);
  const { mine, other } = cardCounts(s);
  const remaining = cardsRemaining(s);
  const unlocked = isWritingUnlocked(s, settings);
  const cardsDone = mine >= NEED_MINE && other >= NEED_OTHER;

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
          <Mark done={cardsDone} />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">2. 記事を読んで Evidence Card（根拠カード）を作る</p>
            <p className="muted mt-1">
              自分の側の記事を{NEED_MINE}本、反対側の記事を{NEED_OTHER}本。読み終えると Card を作る画面に進みます。
            </p>
            {side && (
              <p className="mt-1 flex flex-wrap items-center gap-2 text-sm">
                自分の側：<SideBadge side={side} lang="ja" />
                <span>
                  自分の側 {Math.min(mine, NEED_MINE)}/{NEED_MINE}・反対側 {Math.min(other, NEED_OTHER)}/{NEED_OTHER}
                </span>
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
            <p className="muted mt-1">8つの文を仕分けます。記事を2本読んだあとがおすすめです。</p>
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
            <p className="font-semibold">5. Writing Builder（英作文の組み立て）</p>
            {unlocked ? (
              <Link href="/write" className="btn mt-2">
                Writing Builder を開く
              </Link>
            ) : (
              <p className="muted mt-1">
                🔒 1〜4 が終わると開きます。
                {remaining > 0 && `（Card はあと${remaining}本）`}
                {settings.trapRequired && !s.trapDone && "（Trap or Treasure? も必要）"}
              </p>
            )}
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
            {settings.trapRequired && "　※この授業では必須"}
          </li>
        </ul>
      </div>
    </section>
  );
}
