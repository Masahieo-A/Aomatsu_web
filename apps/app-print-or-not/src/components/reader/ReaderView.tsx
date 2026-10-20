"use client";
import { useState } from "react";
import Link from "next/link";
import { getArticle } from "@/lib/content";
import { guessKey } from "@/lib/store";
import { hiddenIndexesIn } from "@/lib/text";
import type { Article, LevelKey, StudentState } from "@/lib/types";
import ArticleHeader, { SourcesBox } from "./ArticleHeader";
import FactOpinionBox from "./FactOpinionBox";
import GuessBox from "./GuessBox";
import HookCheck from "./HookCheck";
import ParagraphView from "./ParagraphView";
import SectionCard from "./SectionCard";

// 伏せ数字ごとに「その数を含む最初の段落」を探す。Lv1 は見つからなければ指定の段落にする。
function guessSlots(article: Article, lv: LevelKey): Map<number, number[]> {
  const slots = new Map<number, number[]>();
  article.hiddenNumbers.forEach((h, i) => {
    const paras = article.levels[lv].paragraphs;
    let p = paras.findIndex((x) => hiddenIndexesIn(x.text).includes(i));
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

// 英語のレベルは3段階（簡単＝英検準2級、普通＝英検2級、難しい＝大学入学共通テスト）
const LEVELS: { key: LevelKey; label: string }[] = [
  { key: "lv1", label: "簡単" },
  { key: "lv2", label: "普通" },
  { key: "lv3", label: "難しい" },
];

function Reader({ article, s }: { article: Article; s: StudentState }) {
  const [lv, setLv] = useState<LevelKey>("lv1");
  const [taps, setTaps] = useState<Record<string, number>>({});

  const revealed = (i: number) => guessKey(article.id, i) in s.guesses;
  const paras = article.levels[lv].paragraphs;
  const slots = guessSlots(article, lv);

  const tap = (word: string) =>
    setTaps((t) => ({ ...t, [word]: ((t[word] ?? 0) + 1) % 3 }));

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
    `min-h-11 min-w-20 rounded-lg border px-4 py-2 text-[15px] ${on ? "border-accent bg-accent-dim font-semibold" : "border-line bg-white"}`;

  return (
    <div className="page">
      <ArticleHeader article={article} />

      <SectionCard ja="英語のレベル" en="Level" className="mb-4">
        <div className="flex flex-wrap gap-2" role="group" aria-label="英語のレベル">
          {LEVELS.map((l) => (
            <button
              key={l.key}
              type="button"
              aria-pressed={lv === l.key}
              onClick={() => setLv(l.key)}
              className={toggleCls(lv === l.key)}
            >
              {lv === l.key ? "✓ " : ""}
              {l.label}
            </button>
          ))}
        </div>
        <p className="muted mt-3">
          点線の下線の語はタップで英語の説明（もう一度で日本語）。段落ごとのヒントは3段階（キーワード、要旨、全訳）で、少しずつ見られます。
        </p>
      </SectionCard>

      {segments.map((seg, si) => (
        <div key={`${lv}-seg-${seg.from}`}>
          <SectionCard ja={si === 0 ? "本文" : "本文のつづき"} en="Article" className="mb-4">
            {paras.slice(seg.from, seg.to + 1).map((p, k) => {
              const i = seg.from + k;
              return (
                <div key={`${lv}-${i}`} className={k > 0 ? "mt-4 border-t border-line pt-4" : ""}>
                  <ParagraphView
                    article={article}
                    level={lv}
                    index={i}
                    paragraph={p}
                    revealed={revealed}
                    taps={taps}
                    onTap={tap}
                  />
                </div>
              );
            })}
          </SectionCard>
          {seg.quiz.map((hi) => (
            <GuessBox key={hi} article={article} index={hi} h={article.hiddenNumbers[hi]} />
          ))}
        </div>
      ))}

      <FactOpinionBox article={article} />
      <HookCheck articleId={article.id} />
      <SourcesBox article={article} />

      <div className="mt-6">
        <Link href="/" className="btn-secondary">
          記事一覧に戻る
        </Link>
      </div>
    </div>
  );
}
