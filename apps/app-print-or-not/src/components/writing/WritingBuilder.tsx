"use client";
// S7 Writing Builder 本体。下書きは入力のたびに端末内（localStorage）へ保存し、サーバーには送らない。
import { useRef, useState } from "react";
import { useStudent } from "@/lib/store";
import { mySide } from "@/lib/progress";
import { countWords } from "@/lib/text";
import type { Settings, StudentState, WritingDraft } from "@/lib/types";
import SideBadge from "@/components/SideBadge";
import OutlineField from "./OutlineField";
import ExpressionPanel from "./ExpressionPanel";
import SelfCheck, { MANUAL_CHECKS } from "./SelfCheck";

const EMPTY_DRAFT: WritingDraft = {
  outline: { opinion: "", reason1: "", reason2: "", counter: "", conclusion: "" },
  body: "",
  checks: MANUAL_CHECKS.map(() => false),
};

type Outline = WritingDraft["outline"];

export default function WritingBuilder({ s }: { s: StudentState }) {
  const { settings } = useStudent();
  return <Builder s={s} settings={settings} />;
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
      <header>
        <h1 className="page-title">Writing Builder（英作文の組み立て）</h1>
        <p className="muted mb-4">
          アウトラインで構成を考え、本文を英語で書き、セルフチェックを満たしたら完成です。書いた内容はこの端末に自動で保存されます。
        </p>
      </header>

      <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <span className="muted">立場（1=広めるべき〜5=制限すべき）</span>
        <span>読む前 {s.stanceBefore ?? "－"}</span>
        <span>読んだ後 {s.stanceAfter ?? "－"}</span>
        {side && <SideBadge side={side} />}
      </div>

      <div className="md:grid md:grid-cols-[minmax(0,1fr)_280px] md:items-start md:gap-6">
        <div className="space-y-4">
          <div className="box">
            <h2 className="section-title">Topic（お題）</h2>
            <p className="text-base" lang="en">
              Some people say 3D-printed food should become more widespread in our society.
              Others say it should be restricted.
              <br />
              What is your opinion? Give TWO reasons with evidence.
              <br />
              Also write about the opposite opinion and answer it.
              <br />({wordMin}–{wordMax} words)
            </p>
            <p lang="ja" className="mt-2 border-l-4 border-line pl-3 text-base text-muted">
              3Dプリント食品は社会にもっと広めるべきだという人もいれば、制限すべきだという人もいます。あなたの意見は？ 根拠のある理由を2つ書きましょう。反対の意見にも触れて、それに答えましょう。（{wordMin}〜{wordMax}語）
            </p>
          </div>

          <section className="box space-y-4">
            <div>
              <h2 className="section-title">Outline（アウトライン）</h2>
              <p className="muted">書く前に、5つの欄にメモを残します。英語でも日本語でもかまいません。</p>
            </div>
            <OutlineField
              label="Opinion"
              labelJa="自分の意見"
              guide="自分の立場をはっきり言います。理由が2つあることも予告します。"
              hint="自分の立場（理由が2つあると予告）"
              memo={draft.outline.opinion}
              onMemo={(v) => setOutline("opinion", v)}
            />
            <OutlineField
              label="Reason 1"
              labelJa="理由1"
              guide="理由 → 事実（数字・例・出典）→ だから何？ の順で書きます。"
              hint="自分のメモ"
              memo={draft.outline.reason1}
              onMemo={(v) => setOutline("reason1", v)}
            />
            <OutlineField
              label="Reason 2"
              labelJa="理由2"
              guide="理由1とは別の理由を、同じ順（理由 → 事実 → だから何？）で書きます。"
              hint="自分のメモ"
              memo={draft.outline.reason2}
              onMemo={(v) => setOutline("reason2", v)}
            />
            <OutlineField
              label="Counterargument & Rebuttal"
              labelJa="反対意見と反論"
              guide="反対側の意見を1つ紹介し、それに答えます（「たしかに…。でも…」の形）。"
              hint="反対意見と、それへの答え（認める＋でも…）"
              memo={draft.outline.counter}
              onMemo={(v) => setOutline("counter", v)}
            />
            <OutlineField
              label="Conclusion"
              labelJa="まとめ"
              guide="最初の立場を、別の言葉でもう一度言います。"
              hint="立場をもう一度、別の言葉で"
              memo={draft.outline.conclusion}
              onMemo={(v) => setOutline("conclusion", v)}
            />
          </section>

          <section className="box">
            <h2 className="section-title">Writing（本文）</h2>
            <p className="muted mb-3">アウトラインをもとに、英語で本文を書きます。表現集を押すと、カーソルの位置に入ります。</p>
            <details className="mb-3 rounded-lg border border-line px-3 md:hidden">
              <summary className="flex min-h-11 cursor-pointer items-center text-base font-semibold">Useful Expressions（表現集）</summary>
              <div className="mt-2 max-h-80 overflow-y-auto">
                <ExpressionPanel onInsert={insert} />
              </div>
            </details>
            <label className="field-label" htmlFor="write-body">
              英語で書く
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
            <h2 className="section-title">Self-check（セルフチェック）</h2>
            <p className="muted mb-2">提出前に、7項目を自分で確かめます。すべて満たすと「完成」が押せます。</p>
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

        <aside className="box hidden md:sticky md:top-16 md:block md:max-h-[calc(100vh-5rem)] md:overflow-y-auto">
          <h2 className="section-title">Useful Expressions（表現集）</h2>
          <ExpressionPanel onInsert={insert} />
        </aside>
      </div>
    </div>
  );
}
