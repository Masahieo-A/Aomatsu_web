"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getArticle } from "@/lib/content";
import { guessKey, useStudent } from "@/lib/store";
import { fillHidden, hiddenIndexesIn } from "@/lib/text";
import type { Article, StudentState } from "@/lib/types";
import ArticleHeader, { SourcesBox } from "./ArticleHeader";
import FactOpinionBox from "./FactOpinionBox";
import GuessBox from "./GuessBox";
import HookCheck from "./HookCheck";
import ParagraphView from "./ParagraphView";
import ReadAloud from "./ReadAloud";
import SectionCard from "./SectionCard";

type Lv = "lv1" | "lv2";

// 伏せ数字ごとに「その数を含む最初の段落」を探す。Lv1 は見つからなければ指定の段落にする。
function guessSlots(article: Article, lv: Lv): Map<number, number[]> {
  const slots = new Map<number, number[]>();
  article.hiddenNumbers.forEach((h, i) => {
    const paras = article.levels[lv].paragraphs;
    let p = paras.findIndex(
      (x) =>
        hiddenIndexesIn(x.text).includes(i) ||
        hiddenIndexesIn(x.slash).includes(i),
    );
    if (p < 0 && lv === "lv1" && h.paragraph < paras.length) p = h.paragraph;
    if (p < 0) return;
    slots.set(p, [...(slots.get(p) ?? []), i]);
  });
  return slots;
}

export function NotFound() {
  return (
    <div className="page">
      <p className="mb-3">記事が見つかりません。</p>
      <Link href="/" className="btn-secondary">
        記事一覧に戻る
      </Link>
    </div>
  );
}

export default function ReaderView({ id, s }: { id: string; s: StudentState }) {
  const article = getArticle(id);
  if (!article) return <NotFound />;
  return <Reader article={article} s={s} />;
}

function Reader({ article, s }: { article: Article; s: StudentState }) {
  const { update } = useStudent();
  const router = useRouter();
  const [lv, setLv] = useState<Lv>("lv1");
  const [slash, setSlash] = useState(false);
  const [taps, setTaps] = useState<Record<string, number>>({});

  const revealed = (i: number) => guessKey(article.id, i) in s.guesses;
  const paras = article.levels[lv].paragraphs;
  const slots = guessSlots(article, lv);
  const isRead = s.readArticles.includes(article.id);
  const hasCard = !!s.cards[article.id];

  const tap = (word: string) =>
    setTaps((t) => ({ ...t, [word]: ((t[word] ?? 0) + 1) % 3 }));

  const finish = () => {
    update((cur) => ({
      ...cur,
      readArticles: cur.readArticles.includes(article.id)
        ? cur.readArticles
        : [...cur.readArticles, article.id],
      lv2Read:
        lv === "lv2" && !cur.lv2Read.includes(article.id)
          ? [...cur.lv2Read, article.id]
          : cur.lv2Read,
    }));
    router.push(`/card/${article.id}`);
  };

  // 音声：伏せ数字は未公開なら読み飛ばす
  const speakTexts = article.levels.lv1.paragraphs.map((p) =>
    fillHidden(p.text, article, revealed).replace(/？？？/g, ""),
  );

  // 本文カードは数字当てクイズの位置で分割し、クイズを別カードとして挟む
  const segments: { from: number; to: number; quiz: number[] }[] = [];
  let from = 0;
  paras.forEach((_, i) => {
    const quiz = slots.get(i);
    if (quiz || i === paras.length - 1) {
      segments.push({ from, to: i, quiz: quiz ?? [] });
      from = i + 1;
    }
  });

  const toggleCls = (on: boolean) =>
    `min-h-11 rounded-lg border px-4 py-2 text-[15px] ${on ? "border-accent bg-accent-dim font-semibold" : "border-line bg-white"}`;

  return (
    <div className="page">
      <ArticleHeader
        article={article}
        challenge={s.lv2Read.includes(article.id)}
      />

      <SectionCard ja="読み方の設定" en="Reading settings" className="mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <div
            className="flex flex-wrap gap-2"
            role="group"
            aria-label="レベル"
          >
            {(["lv1", "lv2"] as const).map((l) => (
              <button
                key={l}
                type="button"
                aria-pressed={lv === l}
                onClick={() => setLv(l)}
                className={toggleCls(lv === l)}
              >
                {lv === l ? "✓ " : ""}
                {l === "lv1" ? "Lv1 やさしい英語" : "Lv2 少し難しい英語"}
              </button>
            ))}
          </div>
          <button
            type="button"
            aria-pressed={slash}
            onClick={() => setSlash((v) => !v)}
            className={toggleCls(slash)}
          >
            {slash ? "✓ " : ""}スラッシュ表示
          </button>
          <ReadAloud paragraphs={speakTexts} />
        </div>
        <p className="muted mt-3">
          スラッシュ表示は、意味のかたまりごとに /
          で区切ります。点線の下線の語はタップで英語の説明（もう一度で日本語）。
          段落ごとのヒントは3段階（キーワード、要旨、全訳）で、少しずつ見られます。
        </p>
      </SectionCard>

      {segments.map((seg, si) => (
        <div key={`${lv}-seg-${seg.from}`}>
          <SectionCard
            ja={si === 0 ? "本文" : "本文のつづき"}
            en="Article"
            className="mb-4"
          >
            {paras.slice(seg.from, seg.to + 1).map((p, k) => {
              const i = seg.from + k;
              return (
                <div
                  key={`${lv}-${i}`}
                  className={k > 0 ? "mt-4 border-t border-line pt-4" : ""}
                >
                  <ParagraphView
                    article={article}
                    level={lv}
                    index={i}
                    paragraph={p}
                    slash={slash}
                    revealed={revealed}
                    taps={taps}
                    onTap={tap}
                  />
                </div>
              );
            })}
          </SectionCard>
          {seg.quiz.map((hi) => (
            <GuessBox
              key={hi}
              article={article}
              index={hi}
              h={article.hiddenNumbers[hi]}
            />
          ))}
        </div>
      ))}

      <SourcesBox article={article} />
      <FactOpinionBox article={article} />
      {isRead && <HookCheck articleId={article.id} />}

      <SectionCard ja="次にやること" en="Next" className="mt-4">
        <p className="mb-3 text-base">
          読み終えたら Evidence Card を作ります。
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn" onClick={finish}>
            {hasCard ? "読み終えた・Card を見直す" : "読み終えた・Card を作る"}
          </button>
          <Link href="/" className="btn-secondary">
            記事一覧に戻る
          </Link>
        </div>
      </SectionCard>
    </div>
  );
}
