"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import type { ClozeTest } from "@/lib/types";

function ClozeTestContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const grade = searchParams.get("grade") ?? "";
  const lesson = searchParams.get("lesson") ?? "";
  const part = searchParams.get("part") ?? "";

  const [questions, setQuestions] = useState<ClozeTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    fetch("/data/cloze.json")
      .then((r) => r.json() as Promise<ClozeTest[]>)
      .then((data) => {
        const filtered = data
          .filter((d) => d.grade === grade && d.lesson === lesson && d.part === part)
          .sort((a, b) => a.display_order - b.display_order);
        setQuestions(filtered);
        // Initialize answers: for each question, one blank per "___" occurrence
        const init: Record<string, string[]> = {};
        filtered.forEach((q) => {
          const blankCount = (q.body.match(/___/g) ?? []).length;
          init[q.id] = Array(blankCount).fill("");
        });
        setAnswers(init);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [grade, lesson, part]);

  function handleAnswerChange(qId: number, blankIndex: number, value: string) {
    setAnswers((prev) => {
      const arr = [...(prev[qId] ?? [])];
      arr[blankIndex] = value;
      return { ...prev, [qId]: arr };
    });
  }

  function handleSubmit() {
    setSubmitted(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleReset() {
    setSubmitted(false);
    setAnswers((prev) => {
      const reset: Record<string, string[]> = {};
      Object.keys(prev).forEach((k) => {
        reset[k] = Array(prev[k].length).fill("");
      });
      return reset;
    });
  }

  // Parse body: split on ___ → alternate text and blank segments
  function renderBody(q: ClozeTest) {
    const parts = q.body.split("___");
    return (
      <span style={{ fontSize: "1.05rem", lineHeight: 2.2 }}>
        {parts.map((text, i) => (
          <span key={i}>
            {text}
            {i < parts.length - 1 && (
              <input
                type="text"
                value={answers[q.id]?.[i] ?? ""}
                onChange={(e) => handleAnswerChange(q.id, i, e.target.value)}
                readOnly={submitted}
                style={{
                  display: "inline-block",
                  width: "7rem",
                  borderTop: "none",
                  borderLeft: "none",
                  borderRight: "none",
                  borderBottom: "2px solid var(--app-accent)",
                  background: submitted ? "var(--app-accent-dim)" : "transparent",
                  outline: "none",
                  textAlign: "center",
                  fontSize: "1rem",
                  color: "var(--foreground)",
                  padding: "0 0.25rem",
                  margin: "0 0.25rem",
                  fontFamily: "inherit",
                  cursor: submitted ? "default" : "text",
                }}
              />
            )}
          </span>
        ))}
      </span>
    );
  }

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "4rem 0", color: "var(--muted-foreground)" }}>
        読み込み中…
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div style={{ maxWidth: 600, margin: "0 auto", textAlign: "center" }}>
        <p style={{ color: "var(--muted-foreground)", marginBottom: "1.5rem" }}>
          該当する問題が見つかりませんでした。
        </p>
        <button
          onClick={() => router.push("/")}
          style={{
            padding: "0.7rem 1.5rem", borderRadius: "0.5rem", border: "none",
            background: "var(--app-accent)", color: "#fff", fontSize: "0.95rem",
            fontWeight: 600, cursor: "pointer",
          }}
        >
          ← ホームに戻る
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", paddingBottom: "6rem" }}>
      {/* Header */}
      <div style={{ marginBottom: "1.5rem" }}>
        <button
          onClick={() => router.push("/")}
          style={{
            background: "none", border: "none", color: "var(--app-accent)",
            fontSize: "0.88rem", cursor: "pointer", padding: 0, marginBottom: "0.75rem",
            display: "flex", alignItems: "center", gap: "0.3rem",
          }}
        >
          ← ホームに戻る
        </button>
        <h2 style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--app-accent)", margin: 0 }}>
          {grade} – {lesson} – {part}
        </h2>
        <p style={{ color: "var(--muted-foreground)", fontSize: "0.85rem", marginTop: "0.25rem" }}>
          {questions.length} 問
        </p>
      </div>

      {/* Submitted info banner */}
      {submitted && (
        <div style={{
          background: "var(--app-accent-dim)", border: "1.5px solid var(--app-accent-light)",
          borderRadius: "0.75rem", padding: "0.9rem 1.25rem", marginBottom: "1.5rem",
          color: "#1b4332", fontSize: "0.9rem", fontWeight: 500,
        }}>
          ✅ 自分の回答を確認しよう！解答は先生に確認してください。
        </div>
      )}

      {/* Questions */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {questions.map((q, idx) => (
          <div
            key={q.id}
            style={{
              background: "var(--card)", border: "1px solid var(--border)",
              borderRadius: "0.75rem", padding: "1.25rem 1.5rem",
            }}
          >
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
              <span style={{
                flexShrink: 0, width: "1.75rem", height: "1.75rem",
                borderRadius: "50%", background: "var(--app-accent)", color: "#fff",
                fontSize: "0.78rem", fontWeight: 700,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {idx + 1}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ marginBottom: q.trans ? "0.6rem" : 0 }}>
                  {renderBody(q)}
                </div>
                {q.trans && (
                  <p style={{
                    fontSize: "0.82rem", color: "var(--muted-foreground)",
                    margin: 0, borderTop: "1px solid var(--border)", paddingTop: "0.5rem",
                  }}>
                    {q.trans}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Fixed bottom bar */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        background: "#fff", borderTop: "1px solid var(--border)",
        padding: "0.85rem 1.25rem",
        display: "flex", justifyContent: "center", gap: "0.75rem",
        zIndex: 50,
      }}>
        {submitted ? (
          <button
            onClick={handleReset}
            style={{
              padding: "0.75rem 2rem", borderRadius: "0.65rem",
              border: "2px solid var(--app-accent)", background: "#fff",
              color: "var(--app-accent)", fontSize: "1rem", fontWeight: 700,
              cursor: "pointer", minWidth: 160,
            }}
          >
            もう一度
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            style={{
              padding: "0.75rem 2rem", borderRadius: "0.65rem", border: "none",
              background: "var(--app-accent)", color: "#fff",
              fontSize: "1rem", fontWeight: 700, cursor: "pointer", minWidth: 160,
            }}
          >
            完成！
          </button>
        )}
      </div>
    </div>
  );
}

export default function TestPage() {
  return (
    <Suspense fallback={
      <div style={{ textAlign: "center", padding: "4rem 0", color: "var(--muted-foreground)" }}>
        読み込み中…
      </div>
    }>
      <ClozeTestContent />
    </Suspense>
  );
}
