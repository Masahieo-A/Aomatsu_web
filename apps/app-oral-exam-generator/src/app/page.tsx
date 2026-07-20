"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Assignment, AssignmentMode, Submission } from "@/types";

const MODE_LABELS: Record<AssignmentMode, string> = {
  idea: "アイデア・内容重視",
  logic: "論理・説得力重視",
  vocab: "語彙・文法チェック",
};

const STATUS_BADGES: Record<Submission["status"], { label: string; cls: string }> = {
  submitted: { label: "提出済", cls: "bg-slate-200 text-slate-700" },
  analyzed: { label: "解析済", cls: "bg-sky-100 text-sky-800" },
  generated: { label: "生成済", cls: "bg-amber-100 text-amber-800" },
  approved: { label: "承認済", cls: "bg-emerald-100 text-emerald-800" },
};

export default function Home() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  // 課題作成フォーム
  const [title, setTitle] = useState("");
  const [mode, setMode] = useState<AssignmentMode>("idea");
  const [questionCount, setQuestionCount] = useState(3);

  // 提出フォーム
  const [studentLabel, setStudentLabel] = useState("");
  const [text, setText] = useState("");
  const [csvText, setCsvText] = useState("");
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selected = assignments.find((a) => a.assignment_id === selectedId) ?? null;

  const showMessage = (type: "ok" | "error", text: string) => {
    setMessage({ type, text });
  };

  const loadAssignments = useCallback(async () => {
    const res = await fetch("/api/assignments");
    const data = await res.json();
    return (data.assignments ?? []) as Assignment[];
  }, []);

  const loadSubmissions = useCallback(async (assignmentId: string) => {
    const res = await fetch(
      `/api/submissions?assignment_id=${encodeURIComponent(assignmentId)}`
    );
    const data = await res.json();
    return (data.submissions ?? []) as Submission[];
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadAssignments()
      .then((list) => {
        if (!cancelled) setAssignments(list);
      })
      .catch(() => {
        if (!cancelled)
          showMessage("error", "課題一覧の読み込みに失敗しました");
      });
    return () => {
      cancelled = true;
    };
  }, [loadAssignments]);

  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    loadSubmissions(selectedId)
      .then((list) => {
        if (!cancelled) setSubmissions(list);
      })
      .catch(() => {
        if (!cancelled)
          showMessage("error", "提出一覧の読み込みに失敗しました");
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId, loadSubmissions]);

  async function handleCreateAssignment(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, mode, question_count: questionCount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "作成に失敗しました");
      setTitle("");
      setAssignments(await loadAssignments());
      setSelectedId(data.assignment.assignment_id);
      showMessage("ok", `課題「${data.assignment.title}」を作成しました`);
    } catch (err) {
      showMessage("error", err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmitSingle(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedId) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignment_id: selectedId,
          student_label: studentLabel,
          text,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "投入に失敗しました");
      setStudentLabel("");
      setText("");
      setSubmissions(await loadSubmissions(selectedId));
      showMessage("ok", `${data.submission.student_label} の英文を登録しました`);
    } catch (err) {
      showMessage("error", err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function importCsv(content: string) {
    if (!selectedId) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignment_id: selectedId, csv: content }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "CSVの取り込みに失敗しました");
      setCsvText("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      setSubmissions(await loadSubmissions(selectedId));
      const warn =
        data.errors?.length > 0 ? `（スキップ: ${data.errors.join(" / ")}）` : "";
      showMessage("ok", `${data.inserted} 件を取り込みました${warn}`);
    } catch (err) {
      showMessage("error", err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleCsvFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const content = await file.text();
    await importCsv(content);
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold">口頭試問プリント生成ツール</h1>
        <p className="mt-1 text-sm text-slate-500">
          課題・提出管理（Phase 0）— 英作文を投入して一覧を管理します
        </p>
      </header>

      {message && (
        <div
          role="alert"
          className={`mb-6 rounded-md border px-4 py-3 text-sm ${
            message.type === "ok"
              ? "border-emerald-300 bg-emerald-50 text-emerald-800"
              : "border-red-300 bg-red-50 text-red-800"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="grid gap-8 md:grid-cols-[minmax(280px,1fr)_2fr]">
        {/* 左：課題 */}
        <section>
          <h2 className="mb-3 text-lg font-semibold">課題</h2>
          <form
            onSubmit={handleCreateAssignment}
            className="mb-4 space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div>
              <label className="mb-1 block text-sm font-medium" htmlFor="title">
                課題名
              </label>
              <input
                id="title"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例：夏休みの英作文「My Goal」"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium" htmlFor="mode">
                出質モード
              </label>
              <select
                id="mode"
                value={mode}
                onChange={(e) => setMode(e.target.value as AssignmentMode)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                {Object.entries(MODE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium" htmlFor="qcount">
                1枚あたりの出題数
              </label>
              <input
                id="qcount"
                type="number"
                min={1}
                max={5}
                value={questionCount}
                onChange={(e) => setQuestionCount(Number(e.target.value))}
                className="w-24 rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-md bg-[#2d6a4f] px-4 py-2 text-sm font-medium text-white hover:bg-[#1f5238] disabled:opacity-50"
            >
              課題を作成
            </button>
          </form>

          <ul className="space-y-2">
            {assignments.map((a) => (
              <li key={a.assignment_id}>
                <button
                  onClick={() => {
                    setSubmissions([]);
                    setSelectedId(a.assignment_id);
                  }}
                  className={`w-full rounded-lg border px-4 py-3 text-left text-sm shadow-sm transition ${
                    a.assignment_id === selectedId
                      ? "border-[#2d6a4f] bg-white ring-1 ring-[#2d6a4f]"
                      : "border-slate-200 bg-white hover:border-slate-400"
                  }`}
                >
                  <span className="block font-medium">{a.title}</span>
                  <span className="mt-1 block text-xs text-slate-500">
                    {MODE_LABELS[a.mode]} ・ {a.question_count}問 ・{" "}
                    {new Date(a.created_at).toLocaleDateString("ja-JP")}
                  </span>
                </button>
              </li>
            ))}
            {assignments.length === 0 && (
              <li className="rounded-lg border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-400">
                まだ課題がありません
              </li>
            )}
          </ul>
        </section>

        {/* 右：提出 */}
        <section>
          <h2 className="mb-3 text-lg font-semibold">提出英文</h2>
          {!selected ? (
            <div className="rounded-lg border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-400">
              左の一覧から課題を選択（または新規作成）してください
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex gap-2">
                <Link
                  href={`/assignments/${selected.assignment_id}/generate`}
                  className="rounded-md bg-[#2d6a4f] px-4 py-2 text-sm font-medium text-white hover:bg-[#1f5238]"
                >
                  生成実行へ →
                </Link>
                <Link
                  href={`/assignments/${selected.assignment_id}/print`}
                  className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-100"
                >
                  印刷画面へ
                </Link>
                <Link
                  href={`/assignments/${selected.assignment_id}/results`}
                  className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-100"
                >
                  採点・分析へ
                </Link>
              </div>
              <form
                onSubmit={handleSubmitSingle}
                className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
              >
                <h3 className="text-sm font-semibold text-slate-700">
                  1人分ずつ投入 —「{selected.title}」
                </h3>
                <div>
                  <label
                    className="mb-1 block text-sm font-medium"
                    htmlFor="student_label"
                  >
                    生徒ラベル（出席番号など）
                  </label>
                  <input
                    id="student_label"
                    required
                    value={studentLabel}
                    onChange={(e) => setStudentLabel(e.target.value)}
                    placeholder="例：2-3-15"
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium" htmlFor="text">
                    提出英文（原文のまま貼り付け）
                  </label>
                  <textarea
                    id="text"
                    required
                    rows={6}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="I want to be a doctor in the future. ..."
                    className="w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-sm"
                  />
                </div>
                <button
                  type="submit"
                  disabled={busy}
                  className="rounded-md bg-[#2d6a4f] px-4 py-2 text-sm font-medium text-white hover:bg-[#1f5238] disabled:opacity-50"
                >
                  投入する
                </button>
              </form>

              <details className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <summary className="cursor-pointer text-sm font-semibold text-slate-700">
                  CSV一括インポート（student_label,text の2列）
                </summary>
                <div className="mt-3 space-y-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    onChange={handleCsvFile}
                    className="block text-sm"
                  />
                  <p className="text-xs text-slate-500">
                    またはCSVの内容を直接貼り付け：
                  </p>
                  <textarea
                    rows={4}
                    value={csvText}
                    onChange={(e) => setCsvText(e.target.value)}
                    placeholder={'student_label,text\n2-3-01,"I like soccer. I play it every day. It is fun."'}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-xs"
                  />
                  <button
                    type="button"
                    disabled={busy || csvText.trim() === ""}
                    onClick={() => importCsv(csvText)}
                    className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-100 disabled:opacity-50"
                  >
                    貼り付け内容を取り込む
                  </button>
                </div>
              </details>

              <div>
                <h3 className="mb-2 text-sm font-semibold text-slate-700">
                  提出一覧（{submissions.length}件）
                </h3>
                <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white shadow-sm">
                  {submissions.map((s) => {
                    const badge = STATUS_BADGES[s.status];
                    return (
                      <li key={s.submission_id} className="flex items-start gap-3 px-4 py-3">
                        <span
                          className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${badge.cls}`}
                        >
                          {badge.label}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">{s.student_label}</p>
                          <p className="truncate text-xs text-slate-500">{s.text}</p>
                        </div>
                        {(s.status === "generated" || s.status === "approved") && (
                          <Link
                            href={`/assignments/${s.assignment_id}/review/${s.submission_id}`}
                            className="shrink-0 rounded-md border border-slate-300 px-3 py-1 text-xs font-medium hover:bg-slate-100"
                          >
                            レビュー
                          </Link>
                        )}
                      </li>
                    );
                  })}
                  {submissions.length === 0 && (
                    <li className="px-4 py-6 text-center text-sm text-slate-400">
                      まだ提出がありません
                    </li>
                  )}
                </ul>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
