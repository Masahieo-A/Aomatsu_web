"use client";
// S5 Emotion or Evidence?: 8文を「感情論」「根拠あり」に仕分ける。
// パソコンではドラッグ、スマホではボタンで仕分けできる。全問正解で完了。
import Link from "next/link";
import { useState } from "react";
import RequireStudent from "@/components/RequireStudent";
import { useStudent } from "@/lib/store";
import type { StudentState } from "@/lib/types";
import items from "@/data/sort.json";

type Kind = "emotion" | "evidence";
const LABEL: Record<Kind, string> = { emotion: "Emotion（感情論）", evidence: "Evidence（根拠あり）" };

export default function SortPage() {
  return <RequireStudent>{(s) => <Sort s={s} />}</RequireStudent>;
}

function Sort({ s }: { s: StudentState }) {
  const { update } = useStudent();
  const [placed, setPlaced] = useState<Record<string, Kind>>(() =>
    s.sortDone ? Object.fromEntries(items.map((i) => [i.id, i.answer as Kind])) : {},
  );
  const [checked, setChecked] = useState(s.sortDone);
  const [dragId, setDragId] = useState<string | null>(null);

  const allPlaced = items.every((i) => placed[i.id]);
  const wrong = checked ? items.filter((i) => placed[i.id] !== i.answer) : [];
  const allCorrect = checked && wrong.length === 0;

  const place = (id: string, k: Kind) => {
    setPlaced((p) => ({ ...p, [id]: k }));
    setChecked(false);
  };

  const check = () => {
    setChecked(true);
    if (items.every((i) => placed[i.id] === i.answer)) update((cur) => ({ ...cur, sortDone: true }));
  };

  const unplaced = items.filter((i) => !placed[i.id]);

  const renderItem = (i: (typeof items)[number]) => {
    const isWrong = checked && placed[i.id] && placed[i.id] !== i.answer;
    const isRight = checked && placed[i.id] === i.answer;
    return (
      <li
        key={i.id}
        draggable
        onDragStart={() => setDragId(i.id)}
        onDragEnd={() => setDragId(null)}
        className={`box cursor-grab ${isWrong ? "border-red-700" : ""}`}
      >
        <p>{i.text}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {(["emotion", "evidence"] as Kind[]).map((k) => (
            <button
              key={k}
              type="button"
              className={placed[i.id] === k ? "btn-small border-accent bg-accent-dim font-semibold" : "btn-small"}
              aria-pressed={placed[i.id] === k}
              onClick={() => place(i.id, k)}
            >
              {placed[i.id] === k && "✓ "}
              {LABEL[k]}
            </button>
          ))}
        </div>
        {isRight && <p className="mt-2 text-sm font-semibold text-accent">○ 正解</p>}
        {isWrong && (
          <p className="mt-2 text-sm">
            <span className="font-semibold text-red-700">× もう一度</span>　{i.fix}
          </p>
        )}
      </li>
    );
  };

  const zone = (k: Kind) => (
    <section
      onDragOver={(e) => e.preventDefault()}
      onDrop={() => dragId && place(dragId, k)}
      className="rounded-[10px] border-2 border-dashed border-line p-3"
    >
      <h2 className="section-title">{LABEL[k]}</h2>
      <ul className="space-y-2">{items.filter((i) => placed[i.id] === k).map(renderItem)}</ul>
    </section>
  );

  return (
    <div className="page space-y-4">
      <h1 className="page-title">Emotion or Evidence?</h1>
      <p className="muted">
        8つの文を「感情論」と「根拠あり」に分けてください。ドラッグするか、ボタンで選びます。見分け方：誰が読んでも確かめられる事実が入っているか。
      </p>

      {unplaced.length > 0 && <ul className="space-y-2">{unplaced.map(renderItem)}</ul>}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {zone("emotion")}
        {zone("evidence")}
      </div>

      {allCorrect ? (
        <div className="box">
          <p className="font-semibold">✓ 全問正解。感情論は、読む人が確かめられないので説得力がありません。</p>
          <Link href="/map" className="btn mt-3">
            Article Map に戻る
          </Link>
        </div>
      ) : (
        <button className="btn w-full" disabled={!allPlaced} onClick={check}>
          答え合わせ
        </button>
      )}
      {checked && !allCorrect && <p className="text-sm">× の文を直して、もう一度答え合わせをしてください。</p>}
    </div>
  );
}
