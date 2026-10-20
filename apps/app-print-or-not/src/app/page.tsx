"use client";
// トップ = 記事を探す画面。左（約2/3）に課題・検索・進め方、右（約1/3）に全記事一覧
import Link from "next/link";
import RequireStudent from "@/components/RequireStudent";
import ArticleIndex from "@/components/home/ArticleIndex";
import ArticleSearch from "@/components/home/ArticleSearch";
import StepsPanel from "@/components/home/StepsPanel";
import { cardCounts, cardsRemaining, mySide } from "@/lib/progress";
import { useStudent } from "@/lib/store";
import type { StudentState } from "@/lib/types";

export default function HomePage() {
  return <RequireStudent>{(s) => <Home s={s} />}</RequireStudent>;
}

function Home({ s }: { s: StudentState }) {
  const { settings, reset } = useStudent();
  const side = mySide(s);
  const counts = cardCounts(s);
  const totalCards = Object.keys(s.cards).length;

  // 次にやること（S5 は2本目の後、S5-2 は反対側を読んだ後、S6 は Card がそろった後に挟む）
  let next: { href: string; label: string; note: string } | null = null;
  if (totalCards >= 2 && !s.sortDone) {
    next = { href: "/sort", label: "Emotion or Evidence? へ", note: "Card が2枚できました。ここで一度「感情論か、根拠ありか」を仕分けます。" };
  } else if (counts.other >= 1 && !s.trapDone && settings.trapRequired) {
    next = { href: "/trap", label: "Trap or Treasure? へ", note: "反対側の記事を読んだので、強そうで弱い根拠を見抜く練習をします。" };
  } else if (side && cardsRemaining(s) === 0 && s.stanceAfter === undefined) {
    next = { href: "/stance", label: "Stance Check へ", note: "Card がそろいました。読んだあとの立場をもう一度選びます。" };
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="min-w-0 space-y-6 md:col-span-2">
          <section className="box" aria-labelledby="topic-title">
            <h1 id="topic-title" className="page-title !mb-2">
              PRINT or NOT?
            </h1>
            <p className="font-semibold">Should 3D-printed food become more widespread, or should it be restricted?</p>
            <p className="muted">3Dプリント食品は、もっと広めるべき？ それとも制限すべき？</p>
            <div className="mt-3 border-t border-line pt-3 text-sm">
              <p>3D-printed food = food made by a machine that puts soft food (paste) layer by layer to make a shape.</p>
              <p className="muted">3Dプリント食品＝やわらかい食材（ペースト）を機械が一層ずつ重ねて、形を作った食べ物。</p>
            </div>
          </section>

          {next && (
            <section className="box border-2 border-accent" aria-label="次にやること">
              <p className="text-sm font-semibold">次にやること</p>
              <p className="mt-1 text-sm">{next.note}</p>
              <Link href={next.href} className="btn mt-2">
                {next.label}
              </Link>
            </section>
          )}

          <ArticleSearch s={s} />
          <StepsPanel s={s} />

          <p className="text-right text-xs">
            <button
              type="button"
              className="text-muted underline"
              onClick={() => {
                if (confirm("この端末の記録（立場・Card・下書き）をすべて消して、最初からにしますか？")) reset();
              }}
            >
              この端末の記録を消す
            </button>
          </p>
        </div>

        <aside className="min-w-0 md:sticky md:top-[68px] md:max-h-[calc(100vh-84px)] md:self-start md:overflow-y-auto">
          <ArticleIndex s={s} mySide={side} />
        </aside>
      </div>
    </div>
  );
}
