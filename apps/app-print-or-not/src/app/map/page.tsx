"use client";
// S2 Article Map: 賛成・反対の記事一覧と、Writing Builder までの残り条件
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import RequireStudent from "@/components/RequireStudent";
import SideBadge from "@/components/SideBadge";
import { stanceText } from "@/components/StanceMeter";
import { articlesBySide, SIDE_LABEL } from "@/lib/content";
import { cardCounts, cardsRemaining, gateItems, isWritingUnlocked, mySide, otherSide } from "@/lib/progress";
import { useStudent } from "@/lib/store";
import type { Article, Side, StudentState } from "@/lib/types";

export default function MapPage() {
  return <RequireStudent>{(s) => <ArticleMap s={s} />}</RequireStudent>;
}

function ArticleMap({ s }: { s: StudentState }) {
  const { settings, update, syncStatus } = useStudent();
  const router = useRouter();
  const side = mySide(s);
  const counts = cardCounts(s);
  const remaining = cardsRemaining(s);
  const unlocked = isWritingUnlocked(s, settings);
  const totalCards = Object.keys(s.cards).length;

  useEffect(() => {
    if (!s.hookDone) router.replace("/hook");
  }, [s.hookDone, router]);

  // 自分の側を左（先）に並べる
  const order: Side[] = side === "con" ? ["con", "pro"] : ["pro", "con"];

  // 次にやること（S5 は2本目の後、S5-2 は反対側を読んだ後に挟む）
  let next: { href: string; label: string; note: string } | null = null;
  if (totalCards >= 2 && !s.sortDone) {
    next = { href: "/sort", label: "Emotion or Evidence?", note: "2本読んだので、ここで一度「感情論か根拠ありか」を仕分けます。" };
  } else if (counts.other >= 1 && !s.trapDone) {
    next = {
      href: "/trap",
      label: "Trap or Treasure?",
      note: settings.trapRequired ? "反対側の記事を読んだので、強そうで弱い根拠を見抜きます。" : "反対側の記事を読んだので、強そうで弱い根拠を見抜きます（任意）。",
    };
  } else if (remaining === 0 && s.stanceAfter === undefined) {
    next = { href: "/stance", label: "Stance Check", note: "Card がそろいました。もう一度立場を選びます。" };
  }

  return (
    <div className="page space-y-6">
      <h1 className="page-title">Article Map</h1>

      <section className="box space-y-2 text-sm">
        <p>
          最初の立場：{stanceText(s.stanceBefore)}
          {s.stanceAfter !== undefined && <> → 今の立場：{stanceText(s.stanceAfter)}</>}
        </p>
        {side ? (
          <p className="flex flex-wrap items-center gap-2">
            自分の側：<SideBadge side={side} />
            <span className="muted">自分の側を2本、反対側を1本読んで Card を作ります。</span>
          </p>
        ) : (
          <div>
            <p className="mb-2">立場が未決です。まず読む側を選んでください（あとで変えられます）。</p>
            <div className="flex flex-wrap gap-2">
              {(["pro", "con"] as Side[]).map((sd) => (
                <button key={sd} className="btn-secondary" onClick={() => update((cur) => ({ ...cur, firstSide: sd }))}>
                  {SIDE_LABEL[sd].icon} {SIDE_LABEL[sd].en}（{SIDE_LABEL[sd].ja}）から読む
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {next && (
        <section className="box border-accent">
          <p className="text-sm">{next.note}</p>
          <Link href={next.href} className="btn mt-2">
            {next.label}
          </Link>
        </section>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {order.map((sd) => (
          <section key={sd}>
            <h2 className="section-title flex items-center gap-2">
              <SideBadge side={sd} />
              {side && <span className="text-xs font-normal text-muted">{sd === side ? "自分の側" : "反対側"}</span>}
            </h2>
            <ul className="space-y-3">
              {articlesBySide(sd).map((a) => (
                <ArticleCard key={a.id} a={a} s={s} />
              ))}
            </ul>
          </section>
        ))}
      </div>

      <section className="box">
        <h2 className="section-title">Writing Builder まで</h2>
        <ul className="mb-3 space-y-1 text-sm">
          {gateItems(s, settings).map((g) => (
            <li key={g.key}>
              <Link href={g.href} className="text-ink">
                {g.done ? "✓" : "□"} {g.label}
              </Link>
            </li>
          ))}
        </ul>
        {unlocked ? (
          <Link href="/write" className="btn">
            Writing Builder
          </Link>
        ) : (
          <span className="btn-secondary pointer-events-none" aria-disabled>
            🔒 ロック中{remaining > 0 && `（Card あと${remaining}本）`}
          </span>
        )}
        {side && counts.other === 0 && remaining > 0 && (
          <p className="muted mt-2">反対側（{SIDE_LABEL[otherSide(side)].en}）の記事も1本読みます。</p>
        )}
      </section>

      <p className="flex flex-wrap gap-4 text-sm">
        <Link href="/sort">Emotion or Evidence?</Link>
        <Link href="/trap">Trap or Treasure?</Link>
        <Link href="/stance">Stance Check</Link>
      </p>
      {syncStatus === "no-db" && <p className="muted">共有DBが未設定のため、記録はこの端末内にだけ保存されています。</p>}
      {syncStatus === "offline" && <p className="muted">通信できないため、記録は端末内に保存し、あとで送信します。</p>}
    </div>
  );
}

function ArticleCard({ a, s }: { a: Article; s: StudentState }) {
  const read = s.readArticles.includes(a.id);
  const card = !!s.cards[a.id];
  return (
    <li>
      <Link
        href={`/read/${a.id}`}
        className={`box block text-ink no-underline hover:border-accent-light ${a.side === "pro" ? "border-l-4 border-l-pro" : "border-l-4 border-l-con"}`}
      >
        <p className="font-semibold leading-snug">{a.hookTitle}</p>
        <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
          <span aria-label={`難易度 ${a.difficulty}`}>
            {"★".repeat(a.difficulty)}
            {"☆".repeat(3 - a.difficulty)}
          </span>
          <span>{a.minutes} min</span>
          <span>{read ? "✓ 読了" : "未読"}</span>
          <span>{card ? "✓ Card" : "Card 未作成"}</span>
          {s.lv2Read.includes(a.id) && <span>Challenge ✓</span>}
        </p>
      </Link>
    </li>
  );
}
