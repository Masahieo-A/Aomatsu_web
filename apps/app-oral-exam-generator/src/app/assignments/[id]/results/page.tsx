"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { computeItemAnalysis } from "@/lib/analysis/item_stats";
import type { Question, Result, Submission } from "@/types";

const TYPE_LABELS: Record<number, string> = {
  1: "型1 代名詞・文脈理解",
  2: "型2 語彙・パラフレーズ",
  3: "型3 抽象論の具体化",
  4: "型4 文法構造",
  5: "型5 主観・エピソード",
};

const pct = (v: number | null) =>
  v === null ? "—" : `${Math.round(v * 100)}%`;

export default function ResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: assignmentId } = use(params);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(
      `/api/results?assignment_id=${encodeURIComponent(assignmentId)}`
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data as {
      submissions: Submission[];
      questions: Question[];
      results: Result[];
    };
  }, [assignmentId]);

  useEffect(() => {
    let cancelled = false;
    load()
      .then((data) => {
        if (cancelled) return;
        setSubmissions(data.submissions);
        setQuestions(data.questions);
        setResults(data.results);
      })
      .catch((err) => {
        if (!cancelled) setMessage(String(err.message ?? err));
      });
    return () => {
      cancelled = true;
    };
  }, [load]);

  const resultByQuestion = useMemo(
    () => new Map(results.map((r) => [r.question_id, r])),
    [results]
  );

  const analysis = useMemo(
    () => computeItemAnalysis({ submissions, questions, results }),
    [submissions, questions, results]
  );

  async function score(question: Question, studentLabel: string, value: 0 | 1) {
    // 楽観更新
    setResults((prev) => {
      const next = prev.filter((r) => r.question_id !== question.question_id);
      next.push({
        question_id: question.question_id,
        student_label: studentLabel,
        score: value,
        scored_at: new Date().toISOString(),
      });
      return next;
    });
    const res = await fetch("/api/results", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question_id: question.question_id,
        student_label: studentLabel,
        score: value,
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMessage(data.error ?? "採点の保存に失敗しました");
      const fresh = await load();
      setResults(fresh.results);
    }
  }

  const scoredCount = results.length;
  const totalCount = questions.length;

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-8">
      <header className="mb-6">
        <Link href="/" className="text-sm text-slate-500 hover:underline">
          ← 課題・提出管理へ戻る
        </Link>
        <h1 className="mt-2 text-2xl font-bold">採点・分析</h1>
        <p className="mt-1 text-sm text-slate-500">
          実施後の採点結果（◯/×）を入力すると、正答率と弁別指数が集計されます（
          {scoredCount}/{totalCount} 問 採点済み）
        </p>
      </header>

      {message && (
        <div
          role="alert"
          className="mb-4 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {message}
        </div>
      )}

      {/* ダッシュボード */}
      {scoredCount > 0 && (
        <section className="mb-8 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold">
            簡易ダッシュボード（アイテム分析）
          </h2>
          <p className="mb-4 text-sm">
            全体正答率：
            <span className="font-bold">{pct(analysis.overall.correct_rate)}</span>
            <span className="ml-2 text-xs text-slate-500">
              （{analysis.overall.correct}/{analysis.overall.scored}）
            </span>
          </p>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-300 text-left text-xs text-slate-500">
                  <th className="py-2 pr-4">問いの型</th>
                  <th className="py-2 pr-4">採点数</th>
                  <th className="py-2 pr-4">正答率（項目困難度）</th>
                  <th className="py-2 pr-4">弁別指数（上位群−下位群）</th>
                  <th className="py-2">判定</th>
                </tr>
              </thead>
              <tbody>
                {analysis.perType
                  .filter((t) => t.scored > 0)
                  .map((t) => (
                    <tr key={t.type} className="border-b border-slate-100">
                      <td className="py-2 pr-4">{TYPE_LABELS[t.type]}</td>
                      <td className="py-2 pr-4">{t.scored}</td>
                      <td className="py-2 pr-4 font-medium">
                        {pct(t.correct_rate)}
                      </td>
                      <td className="py-2 pr-4 font-medium">
                        {t.discrimination === null
                          ? "—（生徒4人以上で算出）"
                          : t.discrimination.toFixed(2)}
                      </td>
                      <td className="py-2">
                        {t.flags.length === 0 ? (
                          <span className="text-emerald-600">問題なし</span>
                        ) : (
                          <span className="text-amber-700">
                            ⚠ {t.flags.join(" / ")}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-slate-400">
            ⚠のついた型はプロンプト改訂の検討対象です（ver2.md §6.3
            のフィードバックループ）。1問の失点で個人の丸投げを断定しないでください。
          </p>
          {analysis.perStudent.length > 0 && (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-medium text-slate-600">
                生徒別の集計（{analysis.perStudent.length}人）
              </summary>
              <ul className="mt-2 grid grid-cols-2 gap-1 text-sm sm:grid-cols-4">
                {analysis.perStudent.map((s) => (
                  <li key={s.student_label} className="rounded bg-slate-50 px-3 py-1.5">
                    {s.student_label}：{s.correct}/{s.scored}（{pct(s.rate)}）
                  </li>
                ))}
              </ul>
            </details>
          )}
        </section>
      )}

      {/* 採点入力 */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">採点入力</h2>
        {submissions.length === 0 && (
          <p className="rounded-lg border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-400">
            承認済みの提出がありません。レビュー画面で承認すると採点対象になります。
          </p>
        )}
        {submissions.map((s) => {
          const qs = questions.filter(
            (q) => q.submission_id === s.submission_id
          );
          return (
            <div
              key={s.submission_id}
              className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
            >
              <h3 className="mb-2 text-sm font-bold">{s.student_label}</h3>
              <ul className="space-y-2">
                {qs.map((q, i) => {
                  const r = resultByQuestion.get(q.question_id);
                  return (
                    <li
                      key={q.question_id}
                      className="flex items-center gap-3 text-sm"
                    >
                      <span className="w-10 shrink-0 text-xs text-slate-400">
                        問{i + 1}
                      </span>
                      <span className="min-w-0 flex-1 truncate" title={q.question_text}>
                        {q.question_text.replaceAll("**", "")}
                      </span>
                      <span className="flex shrink-0 gap-1">
                        <button
                          onClick={() => score(q, s.student_label, 1)}
                          className={`h-8 w-8 rounded-full border text-sm font-bold ${
                            r?.score === 1
                              ? "border-emerald-600 bg-emerald-600 text-white"
                              : "border-slate-300 text-slate-400 hover:border-emerald-400"
                          }`}
                          aria-label="正解"
                        >
                          ◯
                        </button>
                        <button
                          onClick={() => score(q, s.student_label, 0)}
                          className={`h-8 w-8 rounded-full border text-sm font-bold ${
                            r?.score === 0
                              ? "border-red-500 bg-red-500 text-white"
                              : "border-slate-300 text-slate-400 hover:border-red-400"
                          }`}
                          aria-label="不正解"
                        >
                          ×
                        </button>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </section>
    </main>
  );
}
