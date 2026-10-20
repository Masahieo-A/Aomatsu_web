"use client";
// F3-5 数字当て。予想を保存してから答えを公開する（公開状態＝guesses にキーがあること）。
import { useState } from "react";
import { guessKey, useStudent } from "@/lib/store";
import type { Article, HiddenNumber } from "@/lib/types";
import SectionCard from "./SectionCard";

function fmt(n: number): string {
  return n.toLocaleString("en-US");
}

function ratioText(r: number): string {
  return String(Math.round(r * 10) / 10);
}

// 比が1.5以上／0.67以下は倍数表記、それ以外は多い／少ないだけ
export function diffMessage(guess: number, answer: number): string {
  if (guess === answer) return "ぴったり";
  if (guess <= 0) return "あなたの予想より多い";
  const r = answer / guess;
  if (r >= 1.5) return `あなたの予想より約${ratioText(r)}倍多い`;
  if (r <= 0.67) return `あなたの予想の約${ratioText(r)}倍（予想より少ない）`;
  return answer > guess
    ? "あなたの予想より少し多い"
    : "あなたの予想より少し少ない";
}

export default function GuessBox({
  article,
  index,
  h,
}: {
  article: Article;
  index: number;
  h: HiddenNumber;
}) {
  const { state, update } = useStudent();
  const key = guessKey(article.id, index);
  const saved = state?.guesses[key];
  const hasChoices = !!h.choices && h.choices.length > 0;
  const min = h.min ?? 0;
  const max = h.max ?? Math.max(100, h.answer * 2);
  const [pick, setPick] = useState<number | undefined>(undefined);
  const [touched, setTouched] = useState(false);
  const [slider, setSlider] = useState<number>(Math.round((min + max) / 2));

  const current = hasChoices ? pick : touched ? slider : undefined;

  const reveal = () => {
    if (current === undefined) return;
    update((s) => ({ ...s, guesses: { ...s.guesses, [key]: current } }));
  };

  if (saved !== undefined) {
    return (
      <SectionCard
        ja="クイズ 数字当て"
        en="Guess the number"
        variant="quiz"
        className="my-4"
      >
        <p className="muted mb-1">{h.label}</p>
        <p className="mb-1">
          あなたの予想：<b>{fmt(saved)}</b> {h.unit}
        </p>
        <p className="mb-1" role="status">
          答え：<b>{h.display}</b>（{fmt(h.answer)} {h.unit}）
        </p>
        <p className="font-semibold">{diffMessage(saved, h.answer)}</p>
      </SectionCard>
    );
  }

  const step = max - min >= 100 ? 1 : (max - min) / 100;

  return (
    <SectionCard
      ja="クイズ 数字当て"
      en="Guess the number"
      variant="quiz"
      className="my-4"
    >
      <p className="mb-1 font-semibold">{h.label}</p>
      <p className="mb-2 text-sm">
        本文の ？？？ に入る数を予想してから答えを見よう。単位：{h.unit}
      </p>
      {hasChoices ? (
        <div
          className="mb-3 grid grid-cols-2 gap-2"
          role="radiogroup"
          aria-label={h.label}
        >
          {h.choices!.map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={pick === c}
              onClick={() => setPick(c)}
              className={`min-h-11 rounded-lg border px-3 py-2 text-base ${
                pick === c
                  ? "border-accent bg-accent-dim font-semibold"
                  : "border-line bg-white"
              }`}
            >
              {pick === c ? "✓ " : ""}
              {fmt(c)} {h.unit}
            </button>
          ))}
        </div>
      ) : (
        <div className="mb-3">
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={slider}
            onChange={(e) => {
              setSlider(Number(e.target.value));
              setTouched(true);
            }}
            aria-label={`${h.label}の予想`}
            className="h-11 w-full accent-[var(--color-accent)]"
          />
          <p className="text-center">
            <b>{fmt(slider)}</b> {h.unit}
            <span className="muted">
              （{fmt(min)}〜{fmt(max)}）
            </span>
          </p>
          {!touched && (
            <p className="muted text-center">スライダーを動かして予想する</p>
          )}
        </div>
      )}
      <button
        type="button"
        className="btn"
        disabled={current === undefined}
        onClick={reveal}
      >
        予想を決めて答えを見る
      </button>
    </SectionCard>
  );
}
