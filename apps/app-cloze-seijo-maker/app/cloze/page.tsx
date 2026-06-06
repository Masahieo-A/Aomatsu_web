"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import type { ClozeTest } from "@/lib/types";

// Parse body into segments: alternating text / blank
function parseBody(body: string): { type: "text" | "blank"; content: string }[] {
  const parts = body.split("___");
  return parts.flatMap((text, i) => {
    const result: { type: "text" | "blank"; content: string }[] = [
      { type: "text", content: text },
    ];
    if (i < parts.length - 1) {
      result.push({ type: "blank", content: "" });
    }
    return result;
  });
}

type Answers = Record<number, string[]>; // questionId -> array of blank answers

function ClozeContent() {
  const params = useSearchParams();
  const router = useRouter();
  const lesson = params.get("lesson") ?? "";
  const part = params.get("part") ?? "";

  const [questions, setQuestions] = useState<ClozeTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [answers, setAnswers] = useState<Answers>({});
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!lesson || !part) return;
    fetch("/data/cloze.json")
      .then((r) => r.json() as Promise<ClozeTest[]>)
      .then((all) => {
        const filtered = all
          .filter((q) => q.lesson === lesson && q.part === part)
          .sort((a, b) => a.display_order - b.display_order);
        setQuestions(filtered);
      })
      .catch(() => setError("問題の読み込みに失敗しました。"))
      .finally(() => setLoading(false));
  }, [lesson, part]);

  const handleAnswerChange = (qId: number, blankIndex: number, value: string) => {
    setAnswers((prev) => {
      const current = prev[qId] ?? [];
      const updated = [...current];
      updated[blankIndex] = value;
      return { ...prev, [qId]: updated };
    });
  };

  const handleReset = () => {
    setAnswers({});
    setSubmitted(false);
  };

  if (!lesson || !part) {
    return (
      <div style={{ textAlign: "center", marginTop: "3rem" }}>
        <p style={{ color: "var(--muted-foreground)" }}>URLパラメータが不正です。</p>
        <button onClick={() => router.push("/")} style={backBtnStyle}>← トップへ戻る</button>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "3rem", color: "var(--muted-foreground)" }}>
        問題を読み込み中…
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: "center", padding: "2rem" }}>
        <p style={{ color: "#ef4444" }}>{error}</p>
        <button onClick={() => router.push("/")} style={backBtnStyle}>← トップへ戻る</button>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "2rem" }}>
        <p style={{ color: "var(--muted-foreground)" }}>この範囲の問題はありません。</p>
        <button onClick={() => router.push("/")} style={backBtnStyle}>← トップへ戻る</button>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: "1.5rem" }}>
        <button onClick={() => router.push("/")} style={{ ...backBtnStyle, marginBottom: "0.75rem" }}>
          ← 戻る
        </button>
        <h2 style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--app-accent)" }}>
          📝 クローズテスト
        </h2>
        <p style={{ fontSize: "0.85rem", color: "var(--muted-foreground)" }}>
          {lesson} / {part} — {questions.length} 問
        </p>
      </div>

      {submitted && (
        <div
          style={{
            background: "rgba(45,106,79,0.08)",
            border: "1.5px solid var(--app-accent)",
            borderRadius: "0.75rem",
            padding: "1rem 1.25rem",
            marginBottom: "1.5rem",
            color: "var(--app-accent)",
            fontWeight: 600,
            fontSize: "0.95rem",
          }}
        >
          ✅ 自分の回答を確認しよう！解答は先生に確認してください。
        </div>
      )}

      {/* Question cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", marginBottom: "5rem" }}>
        {questions.map((q, idx) => {
          const segments = parseBody(q.body);
          let blankCount = -1;
          const qAnswers = answers[q.id] ?? [];

          return (
            <div key={q.id} style={cardStyle}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
                <span
                  style={{
                    minWidth: "2rem",
                    height: "2rem",
                    borderRadius: "50%",
                    background: "var(--app-accent)",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    fontSize: "0.9rem",
                    flexShrink: 0,
                  }}
                >
                  {idx + 1}
                </span>

                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: "1rem",
                      lineHeight: 2.2,
                      color: "var(--foreground)",
                      flexWrap: "wrap",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    {segments.map((seg, si) => {
                      if (seg.type === "text") {
                        return (
                          <span key={si} style={{ whiteSpace: "pre-wrap" }}>
                            {seg.content}
                          </span>
                        );
                      }
                      blankCount++;
                      const bi = blankCount;
                      const val = qAnswers[bi] ?? "";
                      return (
                        <input
                          key={si}
                          type="text"
                          value={val}
                          onChange={(e) => {
                            if (!submitted) handleAnswerChange(q.id, bi, e.target.value);
                          }}
                          readOnly={submitted}
                          placeholder="　　　"
                          style={{
                            display: "inline-block",
                            width: "7rem",
                            borderBottom: submitted
                              ? "2px solid var(--app-accent)"
                              : "2px solid var(--border)",
                            borderTop: "none",
                            borderLeft: "none",
                            borderRight: "none",
                            outline: "none",
                            fontSize: "1rem",
                            padding: "0 0.3rem",
                            background: submitted ? "rgba(45,106,79,0.06)" : "transparent",
                            color: submitted ? "var(--app-accent)" : "var(--foreground)",
                            fontWeight: submitted ? 600 : 400,
                            textAlign: "center",
                            margin: "0 0.15rem",
                          }}
                        />
                      );
                    })}
                  </div>

                  {q.trans && (
                    <p
                      style={{
                        fontSize: "0.82rem",
                        color: "var(--muted-foreground)",
                        marginTop: "0.4rem",
                        fontStyle: "italic",
                      }}
                    >
                      {q.trans}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Fixed bottom bar */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          background: "#fff",
          borderTop: "1px solid var(--border)",
          padding: "0.85rem 1.25rem",
          display: "flex",
          gap: "0.75rem",
          justifyContent: "center",
          zIndex: 50,
        }}
      >
        {!submitted ? (
          <button onClick={() => setSubmitted(true)} style={{ ...primaryBtnStyle, minWidth: "200px" }}>
            完成！ →
          </button>
        ) : (
          <>
            <button onClick={handleReset} style={secondaryBtnStyle}>もう一度</button>
            <button onClick={() => router.push("/")} style={secondaryBtnStyle}>トップへ戻る</button>
          </>
        )}
      </div>
    </div>
  );
}

export default function ClozePage() {
  return (
    <Suspense
      fallback={
        <div style={{ textAlign: "center", padding: "3rem", color: "var(--muted-foreground)" }}>
          読み込み中…
        </div>
      }
    >
      <ClozeContent />
    </Suspense>
  );
}

const cardStyle: React.CSSProperties = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: "0.75rem",
  padding: "1.25rem",
  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
};

const backBtnStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "var(--muted-foreground)",
  cursor: "pointer",
  fontSize: "0.85rem",
  padding: "0",
  display: "inline-block",
};

const primaryBtnStyle: React.CSSProperties = {
  padding: "0.75rem 2rem",
  borderRadius: "0.6rem",
  border: "none",
  background: "var(--app-accent)",
  color: "#fff",
  fontSize: "1rem",
  fontWeight: 700,
  cursor: "pointer",
  letterSpacing: "0.03em",
};

const secondaryBtnStyle: React.CSSProperties = {
  padding: "0.75rem 1.5rem",
  borderRadius: "0.6rem",
  border: "1.5px solid var(--border)",
  background: "#fff",
  color: "var(--foreground)",
  fontSize: "0.95rem",
  fontWeight: 600,
  cursor: "pointer",
};
