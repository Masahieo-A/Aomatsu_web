"use client";

import { use, useCallback, useEffect, useState, Fragment } from "react";
import Link from "next/link";
import type { Question, Submission } from "@/types";

const TYPE_LABELS: Record<number, string> = {
  1: "型1 代名詞・文脈理解",
  2: "型2 語彙・パラフレーズ",
  3: "型3 抽象論の具体化",
  4: "型4 文法構造",
  5: "型5 主観・エピソード",
};

/** 設問文中の **語** を太字で描画 */
function renderBold(text: string) {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i}>{part}</strong> : <Fragment key={i}>{part}</Fragment>
  );
}

/** 文中のアンカー箇所をハイライトして描画 */
function renderSentence(text: string, highlight: string | null) {
  if (!highlight || !text.includes(highlight)) return text;
  const idx = text.indexOf(highlight);
  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded bg-yellow-200 px-0.5">{highlight}</mark>
      {text.slice(idx + highlight.length)}
    </>
  );
}

interface EditState {
  question_text: string;
  model_answer: string;
  acceptable_conditions: string;
  typical_wrong: string;
  scoring_steps: string;
}

export default function ReviewPage({
  params,
}: {
  params: Promise<{ id: string; submissionId: string }>;
}) {
  const { id: assignmentId, submissionId } = use(params);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [edit, setEdit] = useState<EditState | null>(null);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/submissions/${submissionId}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data as { submission: Submission; questions: Question[] };
  }, [submissionId]);

  useEffect(() => {
    let cancelled = false;
    load()
      .then((data) => {
        if (cancelled) return;
        setSubmission(data.submission);
        setQuestions(data.questions);
        const first = data.questions.find(
          (q) => q.status === "selected" || q.status === "approved"
        );
        setActiveId(first?.question_id ?? null);
      })
      .catch((err) => {
        if (!cancelled) setMessage({ type: "error", text: String(err.message ?? err) });
      });
    return () => {
      cancelled = true;
    };
  }, [load]);

  const refresh = async () => {
    const data = await load();
    setSubmission(data.submission);
    setQuestions(data.questions);
  };

  const active = questions.filter(
    (q) => q.status === "selected" || q.status === "approved"
  );
  const others = questions.filter(
    (q) => q.status !== "selected" && q.status !== "approved"
  );
  const activeQuestion = questions.find((q) => q.question_id === activeId) ?? null;

  async function handleReplace(questionId: string) {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/questions/${questionId}/replace`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await refresh();
      setActiveId(data.question.question_id);
      setMessage({ type: "ok", text: "次点候補と差し替えました" });
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : String(err) });
    } finally {
      setBusy(false);
    }
  }

  function startEdit(q: Question) {
    setEditingId(q.question_id);
    setEdit({
      question_text: q.question_text,
      model_answer: q.model_answer,
      acceptable_conditions: q.acceptable_conditions,
      typical_wrong: q.typical_wrong,
      scoring_steps: q.scoring_steps,
    });
  }

  async function saveEdit(questionId: string) {
    if (!edit) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/questions/${questionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(edit),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setEditingId(null);
      setEdit(null);
      await refresh();
      setMessage({ type: "ok", text: "編集を保存しました（編集フラグを記録）" });
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : String(err) });
    } finally {
      setBusy(false);
    }
  }

  async function promote(questionId: string) {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/questions/${questionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "selected" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await refresh();
      setMessage({ type: "ok", text: "候補を選抜に昇格しました" });
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : String(err) });
    } finally {
      setBusy(false);
    }
  }

  async function approveAll() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/submissions/${submissionId}/approve`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await refresh();
      setMessage({ type: "ok", text: `全${data.approved}問を承認しました。印刷画面から出力できます` });
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : String(err) });
    } finally {
      setBusy(false);
    }
  }

  const isApproved = submission?.status === "approved";

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-8">
      <header className="mb-6">
        <Link
          href={`/assignments/${assignmentId}/generate`}
          className="text-sm text-slate-500 hover:underline"
        >
          ← 生成実行へ戻る
        </Link>
        <div className="mt-2 flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold">
            教員レビュー：{submission?.student_label ?? "…"}
          </h1>
          <div className="flex items-center gap-3">
            {isApproved ? (
              <Link
                href={`/assignments/${assignmentId}/print`}
                className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
              >
                印刷画面へ
              </Link>
            ) : (
              <button
                onClick={approveAll}
                disabled={busy || active.length === 0}
                className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                全問を承認する
              </button>
            )}
          </div>
        </div>
      </header>

      {message && (
        <div
          role="alert"
          className={`mb-4 rounded-md border px-4 py-3 text-sm ${
            message.type === "ok"
              ? "border-emerald-300 bg-emerald-50 text-emerald-800"
              : "border-red-300 bg-red-50 text-red-800"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* 左ペイン：本文 */}
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">
            提出英文（文番号つき・選択中の問いの出題根拠をハイライト）
          </h2>
          <div className="space-y-2 font-serif text-[15px] leading-relaxed">
            {submission?.analysis?.sentences ? (
              submission.analysis.sentences.map((s) => (
                <p key={s.index}>
                  <span className="mr-2 select-none text-xs font-bold text-slate-400">
                    [{s.index}]
                  </span>
                  {renderSentence(
                    s.text,
                    activeQuestion &&
                      activeQuestion.anchor.sentence_index === s.index
                      ? activeQuestion.anchor.quoted_span
                      : null
                  )}
                </p>
              ))
            ) : (
              <p>{submission?.text}</p>
            )}
          </div>
        </section>

        {/* 右ペイン：選抜された問い */}
        <section className="space-y-4">
          {active.map((q, i) => (
            <article
              key={q.question_id}
              onClick={() => setActiveId(q.question_id)}
              className={`cursor-pointer rounded-lg border bg-white p-4 shadow-sm transition ${
                activeId === q.question_id
                  ? "border-[#2d6a4f] ring-1 ring-[#2d6a4f]"
                  : "border-slate-200 hover:border-slate-400"
              }`}
            >
              <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                <span className="font-bold">問{i + 1}</span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">
                  {TYPE_LABELS[q.type]}
                </span>
                <span className="text-slate-400">
                  根拠：第{q.anchor.sentence_index}文「{q.anchor.quoted_span}」
                </span>
                {q.edited && (
                  <span className="rounded-full bg-violet-100 px-2 py-0.5 text-violet-700">
                    編集済
                  </span>
                )}
                {q.status === "approved" && (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-700">
                    承認済
                  </span>
                )}
              </div>

              {editingId === q.question_id && edit ? (
                <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                  {(
                    [
                      ["question_text", "設問文"],
                      ["model_answer", "模範解答"],
                      ["acceptable_conditions", "◯とする条件"],
                      ["typical_wrong", "典型誤答とその扱い"],
                      ["scoring_steps", "判定手順"],
                    ] as const
                  ).map(([field, label]) => (
                    <div key={field}>
                      <label className="text-xs font-medium text-slate-500">
                        {label}
                      </label>
                      <textarea
                        rows={2}
                        value={edit[field]}
                        onChange={(e) =>
                          setEdit({ ...edit, [field]: e.target.value })
                        }
                        className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                      />
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <button
                      onClick={() => saveEdit(q.question_id)}
                      disabled={busy}
                      className="rounded-md bg-[#2d6a4f] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                    >
                      保存
                    </button>
                    <button
                      onClick={() => {
                        setEditingId(null);
                        setEdit(null);
                      }}
                      className="rounded-md border border-slate-300 px-3 py-1.5 text-xs"
                    >
                      キャンセル
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="mb-3 text-[15px] font-medium">
                    {renderBold(q.question_text)}
                  </p>
                  <dl className="space-y-1.5 rounded-md bg-slate-50 p-3 text-xs leading-relaxed">
                    <div>
                      <dt className="inline font-semibold">模範解答：</dt>
                      <dd className="inline">{q.model_answer}</dd>
                    </div>
                    <div>
                      <dt className="inline font-semibold">◯とする条件：</dt>
                      <dd className="inline">{q.acceptable_conditions}</dd>
                    </div>
                    <div>
                      <dt className="inline font-semibold">典型誤答：</dt>
                      <dd className="inline">{q.typical_wrong}</dd>
                    </div>
                    <div>
                      <dt className="inline font-semibold">判定手順：</dt>
                      <dd className="inline">{q.scoring_steps}</dd>
                    </div>
                  </dl>
                  {!isApproved && (
                    <div
                      className="mt-3 flex gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => handleReplace(q.question_id)}
                        disabled={busy}
                        className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium hover:bg-slate-100 disabled:opacity-50"
                      >
                        差し替え
                      </button>
                      <button
                        onClick={() => startEdit(q)}
                        disabled={busy}
                        className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium hover:bg-slate-100 disabled:opacity-50"
                      >
                        手動編集
                      </button>
                    </div>
                  )}
                </>
              )}
            </article>
          ))}
          {active.length === 0 && (
            <p className="rounded-lg border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-400">
              選抜された問いがありません。生成を実行するか、下の候補一覧から昇格してください。
            </p>
          )}

          {/* 候補一覧（次点・不合格）：手動昇格用 */}
          <details className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <summary className="cursor-pointer text-sm font-semibold text-slate-700">
              候補一覧（次点・不合格 {others.length}件）
            </summary>
            <ul className="mt-3 space-y-3">
              {others.map((q) => {
                const reasons: string[] = [];
                const g1 = (q.gate1?.detail as { failures?: string[] } | null)
                  ?.failures;
                if (q.gate1 && !q.gate1.pass && g1) {
                  reasons.push(...g1.map((f) => `Gate1: ${f}`));
                }
                if (q.gate2 && !q.gate2.pass) {
                  const d = q.gate2.detail as {
                    reason?: string;
                    independent_answer?: string;
                  } | null;
                  reasons.push(
                    `Gate2: ${d?.reason ?? "独立解答が模範解答と一致しません"}` +
                      (d?.independent_answer
                        ? `（独立解答: ${d.independent_answer}）`
                        : "")
                  );
                }
                if (q.gate3 && !q.gate3.pass) {
                  const checks =
                    (
                      q.gate3.detail as {
                        checks?: { item: string; pass: boolean; reason: string }[];
                      } | null
                    )?.checks ?? [];
                  reasons.push(
                    ...checks
                      .filter((c) => !c.pass)
                      .map((c) => `Gate3(${c.item}): ${c.reason}`)
                  );
                }
                return (
                  <li
                    key={q.question_id}
                    className="rounded-md border border-slate-100 bg-slate-50 p-3 text-xs"
                  >
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-slate-200 px-2 py-0.5">
                        {TYPE_LABELS[q.type]}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 font-medium ${
                          q.status === "candidate"
                            ? "bg-sky-100 text-sky-700"
                            : q.status === "replaced"
                              ? "bg-slate-200 text-slate-600"
                              : "bg-red-100 text-red-700"
                        }`}
                      >
                        {q.status === "candidate"
                          ? "次点"
                          : q.status === "replaced"
                            ? "差し替え済"
                            : "不合格"}
                      </span>
                      {q.status !== "rejected" && !isApproved && (
                        <button
                          onClick={() => promote(q.question_id)}
                          disabled={busy}
                          className="ml-auto rounded-md border border-slate-300 bg-white px-2 py-1 font-medium hover:bg-slate-100 disabled:opacity-50"
                        >
                          選抜に昇格
                        </button>
                      )}
                    </div>
                    <p className="font-medium">{renderBold(q.question_text)}</p>
                    <p className="mt-1 text-slate-500">答：{q.model_answer}</p>
                    {reasons.length > 0 && (
                      <p className="mt-1 text-red-600">
                        不合格理由：{reasons.join(" / ")}
                      </p>
                    )}
                  </li>
                );
              })}
              {others.length === 0 && (
                <li className="text-xs text-slate-400">候補はありません</li>
              )}
            </ul>
          </details>
        </section>
      </div>
    </main>
  );
}
