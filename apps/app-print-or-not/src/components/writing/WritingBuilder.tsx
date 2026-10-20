"use client";
// S7 Writing Builder 本体。下書きは入力のたびに端末内（localStorage）へ保存し、サーバーには送らない。
import Link from "next/link";
import { useRef, useState } from "react";
import { useStudent } from "@/lib/store";
import { gateItems, isWritingUnlocked, mySide, otherSide } from "@/lib/progress";
import { countWords } from "@/lib/text";
import type { EvidenceCard, Settings, StudentState, WritingDraft } from "@/lib/types";
import SideBadge from "@/components/SideBadge";
import OutlineField from "./OutlineField";
import ExpressionPanel from "./ExpressionPanel";
import SelfCheck, { MANUAL_CHECKS } from "./SelfCheck";

const EMPTY_DRAFT: WritingDraft = {
  outline: { opinion: "", reason1Card: "", reason1: "", reason2Card: "", reason2: "", counterCard: "", counter: "", conclusion: "" },
  body: "",
  checks: MANUAL_CHECKS.map(() => false),
};

type Outline = WritingDraft["outline"];

export default function WritingBuilder({ s }: { s: StudentState }) {
  const { settings } = useStudent();
  if (!isWritingUnlocked(s, settings)) return <Locked s={s} settings={settings} />;
  return <Builder s={s} settings={settings} />;
}

function Locked({ s, settings }: { s: StudentState; settings: Settings }) {
  return (
    <div className="page">
      <h1 className="page-title">Writing Builder</h1>
      <div className="box">
        <p className="section-title">
          <span aria-hidden>🔒</span> ロック中
        </p>
        <p className="muted mb-3">次の条件を満たすと開きます。</p>
        <ul className="space-y-1">
          {gateItems(s, settings).map((g) => (
            <li key={g.key}>
              <Link href={g.href} className="flex min-h-11 items-center gap-2 text-base text-ink">
                <span className={g.done ? "font-semibold text-accent" : "font-semibold text-muted"}>{g.done ? "✓" : "未"}</span>
                <span className="underline">{g.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Builder({ s, settings }: { s: StudentState; settings: Settings }) {
  const { update } = useStudent();
  const taRef = useRef<HTMLTextAreaElement>(null);
  const [copyMsg, setCopyMsg] = useState("");

  const draft: WritingDraft = {
    ...EMPTY_DRAFT,
    ...s.draft,
    outline: { ...EMPTY_DRAFT.outline, ...s.draft?.outline },
    checks: MANUAL_CHECKS.map((_, i) => s.draft?.checks?.[i] === true),
  };

  // 保存は毎回 localStorage を読み直した状態へ差分だけ重ねる（update の仕様）
  const patch = (fn: (d: WritingDraft) => Partial<WritingDraft>) =>
    update((cur) => {
      const base: WritingDraft = {
        ...EMPTY_DRAFT,
        ...cur.draft,
        outline: { ...EMPTY_DRAFT.outline, ...cur.draft?.outline },
        checks: MANUAL_CHECKS.map((_, i) => cur.draft?.checks?.[i] === true),
      };
      return { ...cur, draft: { ...base, ...fn(base) } };
    });
  const setOutline = (key: keyof Outline, value: string) => patch((d) => ({ outline: { ...d.outline, [key]: value } }));
  // 完成後に本文を直したら、語数・セルフチェックを確かめ直すため「完成」を解除する
  const setBody = (body: string) => patch(() => ({ body, completedAt: undefined }));

  const side = mySide(s);
  const allCards: EvidenceCard[] = Object.values(s.cards);
  const myCards = side ? allCards.filter((c) => c.side === side) : allCards;
  const otherCards = side ? allCards.filter((c) => c.side === otherSide(side)) : allCards;

  const n = countWords(draft.body);
  const { wordMin, wordMax } = settings;
  const wordOk = n >= wordMin && n <= wordMax;
  const wordNote = n < wordMin ? `あと${wordMin - n}語` : n > wordMax ? `${n - wordMax}語オーバー` : "範囲内";
  const allChecked = draft.checks.every(Boolean) && wordOk;

  const insert = (text: string) => {
    const ta = taRef.current;
    const body = draft.body;
    const start = ta?.selectionStart ?? body.length;
    const end = ta?.selectionEnd ?? body.length;
    const before = body.slice(0, start);
    const after = body.slice(end);
    const added = (before && !/\s$/.test(before) ? " " : "") + text;
    const pos = before.length + added.length;
    setBody(before + added + after);
    requestAnimationFrame(() => {
      ta?.focus();
      ta?.setSelectionRange(pos, pos);
    });
  };

  const complete = () => {
    if (!allChecked) return;
    patch(() => ({ completedAt: new Date().toISOString() }));
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(draft.body);
      setCopyMsg("コピーしました。Google Classroom に貼り付けてください。");
    } catch {
      taRef.current?.focus();
      taRef.current?.select();
      setCopyMsg("自動コピーできませんでした。選択された本文をコピー（Ctrl+C / 長押し）してください。");
    }
  };

  return (
    <div className="page max-w-5xl">
      <h1 className="page-title">Writing Builder</h1>

      <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <span className="muted">立場（1=広めるべき〜5=制限すべき）</span>
        <span>読む前 {s.stanceBefore ?? "－"}</span>
        <span>読んだ後 {s.stanceAfter ?? "－"}</span>
        {side && <SideBadge side={side} />}
      </div>

      <div className="md:grid md:grid-cols-[minmax(0,1fr)_280px] md:items-start md:gap-6">
        <div className="space-y-4">
          <div className="box">
            <p className="section-title">Topic</p>
            <p className="text-base">
              Some people say 3D-printed food should become more widespread in our society.
              Others say it should be restricted.
              <br />
              What is your opinion? Give TWO reasons with evidence.
              <br />
              Also write about the opposite opinion and answer it.
              <br />({wordMin}–{wordMax} words)
            </p>
          </div>

          <section className="space-y-3">
            <h2 className="section-title">アウトライン</h2>
            <OutlineField
              label="Opinion"
              hint="自分の立場（理由が2つあると予告）"
              memo={draft.outline.opinion}
              onMemo={(v) => setOutline("opinion", v)}
            />
            <OutlineField
              label="Reason 1"
              hint="自分のメモ"
              memo={draft.outline.reason1}
              onMemo={(v) => setOutline("reason1", v)}
              cards={myCards}
              cardId={draft.outline.reason1Card}
              onCard={(v) => setOutline("reason1Card", v)}
            />
            <OutlineField
              label="Reason 2"
              hint="自分のメモ"
              memo={draft.outline.reason2}
              onMemo={(v) => setOutline("reason2", v)}
              cards={myCards}
              cardId={draft.outline.reason2Card}
              onCard={(v) => setOutline("reason2Card", v)}
            />
            <OutlineField
              label="Counterargument & Rebuttal"
              hint="反対意見と、それへの答え（認める＋でも…）"
              memo={draft.outline.counter}
              onMemo={(v) => setOutline("counter", v)}
              cards={otherCards}
              cardId={draft.outline.counterCard}
              onCard={(v) => setOutline("counterCard", v)}
            />
            <OutlineField
              label="Conclusion"
              hint="立場をもう一度、別の言葉で"
              memo={draft.outline.conclusion}
              onMemo={(v) => setOutline("conclusion", v)}
            />
          </section>

          <section>
            <h2 className="section-title">本文</h2>
            <details className="box mb-2 md:hidden">
              <summary className="flex min-h-11 cursor-pointer items-center text-base font-semibold">表現集</summary>
              <div className="mt-2 max-h-80 overflow-y-auto">
                <ExpressionPanel onInsert={insert} />
              </div>
            </details>
            <label className="field-label" htmlFor="write-body">
              英語で書く（Evidence Card の下敷きは、自分の言葉で書き直す）
            </label>
            <textarea
              id="write-body"
              ref={taRef}
              className="field leading-[1.7]"
              rows={14}
              value={draft.body}
              onChange={(e) => setBody(e.target.value)}
              spellCheck
            />
            <p className="mt-1 text-base" aria-live="polite">
              <span className="font-semibold">{n}語</span>
              <span className="muted">（目標 {wordMin}〜{wordMax}語）</span>{" "}
              <span className={wordOk ? "font-semibold text-accent" : "font-semibold text-red-700"}>
                {wordOk ? "✓ " : ""}
                {wordNote}
              </span>
            </p>
          </section>

          <section className="box">
            <h2 className="section-title">セルフチェック</h2>
            <SelfCheck
              checks={draft.checks}
              onToggle={(i, v) => patch((d) => ({ checks: d.checks.map((c, j) => (j === i ? v : c)) }))}
              wordLabel={`語数が目標範囲内（${wordMin}〜${wordMax}語）`}
              wordOk={wordOk}
            />
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button type="button" className="btn" disabled={!allChecked} onClick={complete}>
                完成
              </button>
              {!allChecked && <span className="muted">7項目すべて満たすと押せます。</span>}
            </div>
            {draft.completedAt && (
              <div className="mt-4 border-t border-line pt-3">
                <p className="mb-2 font-semibold">✓ 完成しました</p>
                <p className="muted mb-2">Google Classroom に貼って提出します。</p>
                <button type="button" className="btn-secondary" onClick={copy}>
                  本文をコピー
                </button>
                {copyMsg && (
                  <p className="mt-2 text-sm" role="status">
                    {copyMsg}
                  </p>
                )}
              </div>
            )}
          </section>
        </div>

        <aside className="hidden md:sticky md:top-16 md:block md:max-h-[calc(100vh-5rem)] md:overflow-y-auto">
          <h2 className="section-title">表現集</h2>
          <ExpressionPanel onInsert={insert} />
        </aside>
      </div>
    </div>
  );
}
