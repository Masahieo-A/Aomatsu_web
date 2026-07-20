"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { Assignment, Submission } from "@/types";

interface StepInfo {
  name: string;
  status: "done" | "failed" | "skipped";
  detail: string;
}

interface Report {
  submission_id: string;
  student_label: string;
  ok: boolean;
  steps: StepInfo[];
  candidate_count: number;
  gate1_pass_count: number;
  gate2_pass_count: number;
  gate3_pass_count: number;
  selected_count: number;
  warnings: string[];
}

interface RunSummary {
  total: number;
  completed: number;
  ok_count: number;
  call_count: number;
  candidate_count: number;
  gate1_pass_count: number;
  gate2_pass_count: number;
  gate3_pass_count: number;
  selected_count: number;
}

interface SseEvent {
  event: string;
  data: Record<string, unknown>;
}

/** "event: X\ndata: {...}" 形式のチャンクをパース */
function parseSseChunk(chunk: string): SseEvent | null {
  const eventMatch = chunk.match(/^event:\s*(.+)$/m);
  const dataMatch = chunk.match(/^data:\s*(.+)$/m);
  if (!eventMatch || !dataMatch) return null;
  try {
    return { event: eventMatch[1].trim(), data: JSON.parse(dataMatch[1]) };
  } catch {
    return null;
  }
}

export default function GeneratePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: assignmentId } = use(params);
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [reports, setReports] = useState<Record<string, Report>>({});
  const [liveSteps, setLiveSteps] = useState<Record<string, string>>({});
  const [summary, setSummary] = useState<RunSummary | null>(null);
  const [running, setRunning] = useState<string | null>(null); // submission_id or "ALL"
  const [errors, setErrors] = useState<string[]>([]);

  const load = useCallback(async () => {
    const [aRes, sRes] = await Promise.all([
      fetch("/api/assignments"),
      fetch(`/api/submissions?assignment_id=${encodeURIComponent(assignmentId)}`),
    ]);
    const aData = await aRes.json();
    const sData = await sRes.json();
    return {
      assignment:
        (aData.assignments as Assignment[]).find(
          (a) => a.assignment_id === assignmentId
        ) ?? null,
      submissions: (sData.submissions ?? []) as Submission[],
    };
  }, [assignmentId]);

  useEffect(() => {
    let cancelled = false;
    load().then((data) => {
      if (cancelled) return;
      setAssignment(data.assignment);
      setSubmissions(data.submissions);
    });
    return () => {
      cancelled = true;
    };
  }, [load]);

  const refreshSubmissions = useCallback(async () => {
    const data = await load();
    setSubmissions(data.submissions);
  }, [load]);

  // --- 単発実行（JSON） ---------------------------------------------------
  async function handleGenerateOne(submissionId: string) {
    setRunning(submissionId);
    setErrors([]);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submission_id: submissionId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrors([data.error ?? "生成に失敗しました"]);
        return;
      }
      setReports((prev) => ({ ...prev, [submissionId]: data.report }));
      await refreshSubmissions();
    } finally {
      setRunning(null);
    }
  }

  // --- 一括実行（SSE） ------------------------------------------------------
  async function handleGenerateAll(confirm = false) {
    setRunning("ALL");
    if (!confirm) {
      setErrors([]);
      setSummary(null);
    }
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignment_id: assignmentId, confirm }),
      });

      if (res.status === 409) {
        const data = await res.json();
        if (window.confirm(data.warning)) {
          await handleGenerateAll(true);
        }
        return;
      }
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        setErrors([data.error ?? "一括実行の開始に失敗しました"]);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let sep;
        while ((sep = buffer.indexOf("\n\n")) !== -1) {
          const chunk = buffer.slice(0, sep);
          buffer = buffer.slice(sep + 2);
          const parsed = parseSseChunk(chunk);
          if (!parsed) continue;
          await handleSseEvent(parsed);
        }
      }
      await refreshSubmissions();
    } catch (err) {
      setErrors((prev) => [
        ...prev,
        err instanceof Error ? err.message : String(err),
      ]);
    } finally {
      setRunning(null);
      setLiveSteps({});
    }
  }

  async function handleSseEvent({ event, data }: SseEvent) {
    if (event === "progress") {
      const sid = data.submission_id as string;
      const label = `${data.step}${data.phase === "start" ? " 実行中…" : data.phase === "failed" ? " ✗" : " ✓"}`;
      setLiveSteps((prev) => ({ ...prev, [sid]: label }));
    } else if (event === "report") {
      const report = data as unknown as Report;
      setReports((prev) => ({ ...prev, [report.submission_id]: report }));
      setLiveSteps((prev) => {
        const next = { ...prev };
        delete next[report.submission_id];
        return next;
      });
      await refreshSubmissions();
    } else if (event === "error") {
      setErrors((prev) => [
        ...prev,
        `${data.student_label ?? data.submission_id}: ${data.message}`,
      ]);
    } else if (event === "done") {
      setSummary(data as unknown as RunSummary);
    }
  }

  const reportList = Object.values(reports);
  const rate = (num: number, den: number) =>
    den > 0 ? `${Math.round((num / den) * 100)}%` : "—";
  const agg = summary ?? {
    candidate_count: reportList.reduce((a, r) => a + r.candidate_count, 0),
    gate1_pass_count: reportList.reduce((a, r) => a + r.gate1_pass_count, 0),
    gate2_pass_count: reportList.reduce((a, r) => a + r.gate2_pass_count, 0),
    gate3_pass_count: reportList.reduce((a, r) => a + r.gate3_pass_count, 0),
  };

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-8">
      <header className="mb-6">
        <Link href="/" className="text-sm text-slate-500 hover:underline">
          ← 課題・提出管理へ戻る
        </Link>
        <h1 className="mt-2 text-2xl font-bold">
          生成実行{assignment ? `：${assignment.title}` : ""}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          前処理 → 候補生成（{assignment?.question_count ?? 3}問×3倍）→ Gate1
          機械検証 → Gate2 自己整合性 → Gate3 LLM審査 → 選抜
        </p>
      </header>

      <div className="mb-4 flex items-center gap-4">
        <button
          onClick={() => handleGenerateAll()}
          disabled={running !== null || submissions.length === 0}
          className="rounded-md bg-[#2d6a4f] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#1f5238] disabled:opacity-50"
        >
          {running === "ALL" ? "一括生成 実行中…" : "全員分を生成"}
        </button>
        {running === "ALL" && (
          <p className="animate-pulse text-sm text-slate-500">
            レート制限対応のため1人あたり1分前後かかります
          </p>
        )}
      </div>

      {/* 関門通過率サマリー */}
      {reportList.length > 0 && (
        <div className="mb-6 grid grid-cols-2 gap-3 rounded-lg border border-slate-200 bg-white p-4 text-sm shadow-sm sm:grid-cols-4">
          <div>
            <p className="text-xs text-slate-500">候補生成</p>
            <p className="font-semibold">{agg.candidate_count}問</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Gate1 通過率</p>
            <p className="font-semibold">
              {rate(agg.gate1_pass_count, agg.candidate_count)}
              <span className="ml-1 text-xs font-normal text-slate-400">
                ({agg.gate1_pass_count}/{agg.candidate_count})
              </span>
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Gate2 通過率</p>
            <p className="font-semibold">
              {rate(agg.gate2_pass_count, agg.gate1_pass_count)}
              <span className="ml-1 text-xs font-normal text-slate-400">
                ({agg.gate2_pass_count}/{agg.gate1_pass_count})
              </span>
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Gate3 通過率</p>
            <p className="font-semibold">
              {rate(agg.gate3_pass_count, agg.gate2_pass_count)}
              <span className="ml-1 text-xs font-normal text-slate-400">
                ({agg.gate3_pass_count}/{agg.gate2_pass_count})
              </span>
            </p>
          </div>
          {summary && (
            <p className="col-span-full border-t border-slate-100 pt-2 text-xs text-slate-500">
              {summary.completed}/{summary.total} 件完了（成功{" "}
              {summary.ok_count} 件）・API呼び出し {summary.call_count} 回
            </p>
          )}
        </div>
      )}

      {errors.length > 0 && (
        <div className="mb-6 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
          {errors.map((e, i) => (
            <p key={i}>{e}</p>
          ))}
        </div>
      )}

      <ul className="space-y-3">
        {submissions.map((s) => {
          const report = reports[s.submission_id];
          const liveStep = liveSteps[s.submission_id];
          const isRunning = running === s.submission_id;
          return (
            <li
              key={s.submission_id}
              className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">{s.student_label}</p>
                  <p className="max-w-md truncate text-xs text-slate-500">
                    {s.text}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {(s.status === "generated" || s.status === "approved") && (
                    <Link
                      href={`/assignments/${assignmentId}/review/${s.submission_id}`}
                      className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium hover:bg-slate-100"
                    >
                      レビューへ
                    </Link>
                  )}
                  <button
                    onClick={() => handleGenerateOne(s.submission_id)}
                    disabled={running !== null}
                    className="rounded-md bg-slate-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-600 disabled:opacity-50"
                  >
                    {isRunning
                      ? "生成中…"
                      : s.status === "generated" || s.status === "approved"
                        ? "再生成"
                        : "生成"}
                  </button>
                </div>
              </div>

              {(isRunning || liveStep) && (
                <p className="mt-3 animate-pulse text-xs font-medium text-sky-700">
                  {liveStep ?? "Gemini API を呼び出しています…"}
                </p>
              )}

              {report && (
                <div className="mt-3 space-y-1 border-t border-slate-100 pt-3">
                  <div className="flex flex-wrap gap-2">
                    {report.steps.map((step) => (
                      <span
                        key={step.name}
                        title={step.detail}
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          step.status === "done"
                            ? "bg-emerald-100 text-emerald-800"
                            : step.status === "failed"
                              ? "bg-red-100 text-red-800"
                              : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {step.name}:{" "}
                        {step.status === "done"
                          ? "✓"
                          : step.status === "skipped"
                            ? "スキップ"
                            : "✗"}
                      </span>
                    ))}
                  </div>
                  <ul className="text-xs text-slate-600">
                    {report.steps.map((step) => (
                      <li key={step.name}>
                        <span className="font-medium">{step.name}</span>：
                        {step.detail}
                      </li>
                    ))}
                  </ul>
                  {report.warnings.length > 0 && (
                    <div className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
                      {report.warnings.map((w, i) => (
                        <p key={i}>⚠ {w}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </li>
          );
        })}
        {submissions.length === 0 && (
          <li className="rounded-lg border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-400">
            この課題にはまだ提出がありません
          </li>
        )}
      </ul>
    </main>
  );
}
