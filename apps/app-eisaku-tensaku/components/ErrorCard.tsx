/**
 * 1件の文法エラーをカード表示し、Level 1〜3 のヒントを段階的に開示する。
 * Pattern B デザイン：番号付きヒントチェーンで、自律的な修正学習を促す。
 */
"use client";

import { useState } from "react";
import type { OutputType, CorrectionType } from "@/lib/schema";

type ErrorItem = OutputType["errors"][number];

type Props = { item: ErrorItem; index: number };

/** 解答比較用の正規化：前後空白除去・小文字化・連続空白圧縮・末尾以外の記号除去 */
function normalize(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[.,!?;:"'’”“]/g, "");
}

/* ===== 解答練習ウィジェット ===== */
function AnswerPractice({ correction }: { correction: CorrectionType }) {
  const isRewrite = correction.type === "rewrite";
  const [value, setValue] = useState("");
  const [status, setStatus] = useState<"idle" | "correct" | "incorrect">("idle");
  const [showAnswer, setShowAnswer] = useState(false);

  const check = () => {
    if (!value.trim()) return;
    const input = normalize(value);
    const targets = isRewrite
      ? [normalize(correction.correctedSentence)]
      : correction.acceptableAnswers.map(normalize);
    const ok = targets.some((t) => t.length > 0 && t === input);
    setStatus(ok ? "correct" : "incorrect");
  };

  const onChange = (v: string) => {
    setValue(v);
    if (status !== "idle") setStatus("idle"); // 入力を変えたら判定をリセット
  };

  return (
    <div className="mt-3 rounded-[8px] border border-[#e2ddd8] bg-[#f8f7f4] p-3">
      <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-[#6b645c]">
        ✏️ 解答を入力して練習
      </p>

      {isRewrite ? (
        <>
          <p className="mb-2 text-sm leading-relaxed text-[#1a1714]">
            この修正は文全体の書き直しが必要です。
            <span className="font-semibold text-[#2d6a4f]">
              ヒントに従って全文を書き直してみよう。
            </span>
          </p>
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={2}
            placeholder="ここに全文を書き直して入力"
            className="w-full resize-y rounded-[6px] border border-[#e2ddd8] bg-white p-2.5 font-mono text-sm leading-relaxed text-[#1a1714] outline-none focus:border-[#52b788]"
          />
        </>
      ) : (
        <>
          <p className="mb-2 font-mono text-sm leading-relaxed text-[#1a1714]">
            {correction.maskedSentence}
          </p>
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && check()}
            placeholder="空欄に入る語を入力"
            className="w-full rounded-[6px] border border-[#e2ddd8] bg-white p-2.5 font-mono text-sm text-[#1a1714] outline-none focus:border-[#52b788]"
          />
        </>
      )}

      {/* 判定結果 */}
      {status === "correct" && (
        <p className="mt-2 flex items-center gap-1.5 text-sm font-bold text-[#2d6a4f]">
          <span className="text-lg">◯</span> 正解です！よくできました。
        </p>
      )}
      {status === "incorrect" && (
        <p className="mt-2 flex items-center gap-1.5 text-sm font-bold text-[#c0392b]">
          <span className="text-lg">✕</span>{" "}
          {isRewrite
            ? "おしい！別の正しい書き方もあります。ヒントを見て、もう一度挑戦してみましょう。"
            : "もう一度挑戦してみましょう。"}
        </p>
      )}

      {/* アクション */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={check}
          disabled={!value.trim()}
          className="rounded-[8px] bg-[#2d6a4f] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1f5238] disabled:cursor-not-allowed disabled:opacity-40"
        >
          答え合わせをする
        </button>
        <button
          type="button"
          onClick={() => setShowAnswer((p) => !p)}
          className="rounded-[8px] border border-[#e2ddd8] bg-white px-4 py-2 text-sm font-semibold text-[#6b645c] transition hover:border-[#52b788] hover:text-[#2d6a4f]"
        >
          {showAnswer ? "解答を隠す" : "解答を見る"}
        </button>
      </div>

      {/* 模範解答 */}
      {showAnswer && (
        <div className="mt-3 rounded-[6px] border border-[#d8f3dc] bg-[#d8f3dc]/40 px-3 py-2.5">
          <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-[#2d6a4f]">
            模範解答
          </p>
          {!isRewrite && correction.acceptableAnswers.length > 0 && (
            <p className="text-sm text-[#1a1714]">
              空欄：
              <span className="font-mono font-semibold text-[#2d6a4f]">
                {correction.acceptableAnswers.join(" / ")}
              </span>
            </p>
          )}
          <p className="mt-0.5 font-mono text-sm leading-relaxed text-[#1a1714]">
            {correction.correctedSentence}
          </p>
          {isRewrite && (
            <p className="mt-1 text-xs leading-relaxed text-[#6b645c]">
              ※ これは一例です。同じ意味で文法的に正しければ、別の書き方でも正解です。
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function ErrorCard({ item, index }: Props) {
  const [revealed, setReveal] = useState<Set<1 | 2 | 3>>(new Set([1]));

  const reveal = (level: 2 | 3) => {
    setReveal((prev) => new Set([...prev, level]));
  };

  const nodes = [
    { num: 1 as const, text: item.hints.level1, label: "文法的な観点" },
    { num: 2 as const, text: item.hints.level2, label: "もう少し詳しく" },
    { num: 3 as const, text: item.hints.level3, label: "丁寧な説明" },
  ];

  return (
    <div className="overflow-hidden rounded-[10px] border border-[#e2ddd8] bg-white">
      {/* カードヘッダー */}
      <div className="flex items-start gap-3 border-b border-[#e2ddd8] bg-[#f8f7f4] px-4 py-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#2d6a4f] text-xs font-bold text-white">
          {index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <span className="inline-block rounded-full bg-[#d8f3dc] px-2 py-0.5 text-[11px] font-bold text-[#2d6a4f]">
            {item.errorType}
          </span>
          <p className="mt-1 font-mono text-sm leading-relaxed text-[#1a1714]">
            &ldquo;{item.sentence}&rdquo;
          </p>
        </div>
      </div>

      {/* ヒントチェーン */}
      <div className="px-4 py-3">
        <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-[#6b645c]">
          ヒント（段階的に確認できます）
        </p>

        <div className="hint-chain space-y-3">
          {nodes.map((node) => {
            const isShown = revealed.has(node.num);
            const isNext =
              !isShown &&
              (node.num === 2 ? revealed.has(1) : revealed.has(2));
            const isLocked = !isShown && !isNext;

            return (
              <div key={node.num} className="flex gap-2">
                <div
                  className={[
                    "mt-0.5 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full text-[11px] font-bold transition-colors",
                    isShown
                      ? "bg-[#2d6a4f] text-white"
                      : isNext
                        ? "cursor-pointer border-2 border-dashed border-[#52b788] bg-[#d8f3dc] text-[#2d6a4f]"
                        : "bg-[#e2ddd8] text-[#6b645c]",
                  ].join(" ")}
                  onClick={() => isNext && reveal(node.num as 2 | 3)}
                  role={isNext ? "button" : undefined}
                  aria-label={isNext ? `ヒント ${node.num} を見る` : undefined}
                >
                  {node.num}
                </div>

                <div className="min-w-0 flex-1">
                  {isShown && (
                    <>
                      <p className="mb-0.5 text-[11px] font-semibold text-[#6b645c]">
                        {node.label}
                      </p>
                      <p className="text-sm leading-relaxed text-[#1a1714]">
                        {node.text}
                      </p>
                      {node.num === 3 && item.specificTerm && (
                        <p className="mt-1.5 text-xs font-semibold text-[#2d6a4f]">
                          📖 文法用語：{item.specificTerm}
                        </p>
                      )}
                    </>
                  )}

                  {isNext && (
                    <button
                      type="button"
                      className="text-sm font-semibold text-[#2d6a4f] hover:underline"
                      onClick={() => reveal(node.num as 2 | 3)}
                    >
                      ヒント {node.num} を見る →
                    </button>
                  )}

                  {isLocked && (
                    <p className="text-sm italic text-[#6b645c]">
                      ヒント {node.num - 1} を見た後に解放されます
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* 解答練習ウィジェット */}
        {item.correction && <AnswerPractice correction={item.correction} />}
      </div>
    </div>
  );
}
