"use client";
// 1段落分の表示：語注ボタン、ヒント梯子。
import { Fragment, useState } from "react";
import { hintKey, useStudent } from "@/lib/store";
import { fillHidden } from "@/lib/text";
import type { Article, GlossaryItem, LevelKey, Paragraph } from "@/lib/types";
import { tokenizeGloss } from "./gloss";

interface Props {
  article: Article;
  level: LevelKey;
  index: number;
  paragraph: Paragraph;
  revealed: (i: number) => boolean;
  taps: Record<string, number>;
  onTap: (word: string) => void;
}

const HINT_LABEL = ["キーワード", "要旨", "全訳"];

export default function ParagraphView({
  article,
  level,
  index,
  paragraph,
  revealed,
  taps,
  onTap,
}: Props) {
  const { update } = useStudent();
  const [opened, setOpened] = useState(0); // 開いた最大のヒント番号（0〜3）

  const shown = fillHidden(paragraph.text, article, revealed);
  const tokens = tokenizeGloss(shown, article.glossary);

  const seen = new Map<string, GlossaryItem>();
  for (const t of tokens) if (t.item) seen.set(t.item.word, t.item);
  const usedGloss = [...seen.values()];
  const tapped = usedGloss.filter((g) => (taps[g.word] ?? 0) > 0);

  const openNext = () => {
    if (opened >= 3) return;
    const hint = (opened + 1) as 1 | 2 | 3;
    const k = hintKey(article.id, level, index, hint);
    update((s) => ({
      ...s,
      hintCounts: { ...s.hintCounts, [k]: (s.hintCounts[k] ?? 0) + 1 },
    }));
    setOpened(hint);
  };

  return (
    <section aria-label={`第${index + 1}段落`}>
      <p className="muted mb-1">段落{index + 1}</p>
      <p className="text-base leading-[1.7]">
        {tokens.map((t, ti) =>
              t.item ? (
                <button
                  key={ti}
                  type="button"
                  onClick={() => onTap(t.item!.word)}
                  aria-expanded={(taps[t.item.word] ?? 0) > 0}
                  className={`underline decoration-dotted underline-offset-4 ${
                    (taps[t.item.word] ?? 0) > 0
                      ? "bg-accent-dim font-semibold"
                      : "text-accent-strong"
                  }`}
                >
                  {t.text}
                </button>
              ) : (
                <Fragment key={ti}>{t.text}</Fragment>
              ),
        )}
      </p>

      {tapped.length > 0 && (
        <ul
          className="mt-2 space-y-1 rounded-lg border border-line p-3 text-sm"
          aria-label="語注"
        >
          {tapped.map((g) => (
            <li key={g.word}>
              <b>{g.word}</b>：{g.easyEn}
              {(taps[g.word] ?? 0) >= 2 && (
                <span className="ml-1 text-muted">／ {g.ja}</span>
              )}
              {(taps[g.word] ?? 0) < 2 && (
                <span className="ml-1 text-muted">
                  （もう一度タップで日本語）
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      {opened > 0 && (
        <div className="mt-2 rounded-lg border border-line p-3 text-sm">
          <p className="mb-1 text-sm font-semibold text-muted">ヒント</p>
          <ol className="space-y-1">
            {paragraph.hints.slice(0, opened).map((h, i) => (
              <li key={i}>
                <b>
                  Hint {i + 1}（{HINT_LABEL[i]}）
                </b>
                ：{fillHidden(h, article, revealed)}
              </li>
            ))}
          </ol>
        </div>
      )}
      {opened < 3 && (
        <button
          type="button"
          className="btn-small mt-2 min-h-11"
          onClick={openNext}
        >
          Hint {opened + 1}（{HINT_LABEL[opened]}）を見る
        </button>
      )}
    </section>
  );
}
