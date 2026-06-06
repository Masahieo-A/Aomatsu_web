"use client";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { SentenceRearrangement } from "@/lib/types";

// Fisher-Yates shuffle
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

type Token = { id: string; word: string };

type QuestionState = {
  item: SentenceRearrangement;
  tokens: Token[]; // original token list
  bank: Token[];
  answer: Token[];
};

function buildInitialState(items: SentenceRearrangement[]): QuestionState[] {
  return items.map((item) => {
    const words = item.sentence.split(" ").filter(Boolean);
    const tokens: Token[] = words.map((w, i) => ({ id: `${item.id}-${i}`, word: w }));
    return { item, tokens, bank: shuffle(tokens), answer: [] };
  });
}

const chipBase: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "0.35rem 0.85rem",
  borderRadius: "9999px",
  fontSize: "0.95rem",
  fontWeight: 500,
  cursor: "pointer",
  border: "1.5px solid",
  transition: "background 0.1s, color 0.1s",
  userSelect: "none",
  fontFamily: "monospace, sans-serif",
  letterSpacing: "0.02em",
};

function TestContent() {
  const router = useRouter();
  const params = useSearchParams();
  const grade = params.get("grade") ?? "";
  const lesson = params.get("lesson") ?? "";
  const part = params.get("part") ?? "";

  const [questions, setQuestions] = useState<QuestionState[]>([]);
  const [loading, setLoading] = useState(true);
  const [scored, setScored] = useState(false);
  const [results, setResults] = useState<boolean[]>([]);

  useEffect(() => {
    fetch("/data/seijo.json")
      .then((r) => r.json() as Promise<SentenceRearrangement[]>)
      .then((data) => {
        const filtered = data
          .filter((d) => d.grade === grade && d.lesson === lesson && d.part === part)
          .sort((a, b) => a.seq - b.seq);
        setQuestions(buildInitialState(filtered));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [grade, lesson, part]);

  const moveToAnswer = useCallback((qIdx: number, token: Token) => {
    if (scored) return;
    setQuestions((prev) => {
      const next = prev.map((q, i) => {
        if (i !== qIdx) return q;
        return {
          ...q,
          bank: q.bank.filter((t) => t.id !== token.id),
          answer: [...q.answer, token],
        };
      });
      return next;
    });
  }, [scored]);

  const moveToBank = useCallback((qIdx: number, token: Token) => {
    if (scored) return;
    setQuestions((prev) => {
      const next = prev.map((q, i) => {
        if (i !== qIdx) return q;
        return {
          ...q,
          answer: q.answer.filter((t) => t.id !== token.id),
          bank: [...q.bank, token],
        };
      });
      return next;
    });
  }, [scored]);

  const resetQuestion = useCallback((qIdx: number) => {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIdx) return q;
        return { ...q, bank: shuffle(q.tokens), answer: [] };
      })
    );
  }, []);

  const handleScore = useCallback(() => {
    const res = questions.map((q) => {
      const answerStr = q.answer.map((t) => t.word).join(" ").trim().toLowerCase();
      const correct = q.item.sentence.trim().toLowerCase();
      return answerStr === correct;
    });
    setResults(res);
    setScored(true);
  }, [questions]);

  const handleReset = useCallback(() => {
    setQuestions((prev) => prev.map((q) => ({ ...q, bank: shuffle(q.tokens), answer: [] })));
    setScored(false);
    setResults([]);
  }, []);

  const score = useMemo(() => results.filter(Boolean).length, [results]);

  if (loading) {
    return <p style={{ color: "var(--muted-foreground)", textAlign: "center", marginTop: "3rem" }}>読み込み中…</p>;
  }

  if (questions.length === 0) {
    return (
      <div style={{ textAlign: "center", marginTop: "3rem" }}>
        <p style={{ color: "var(--muted-foreground)", marginBottom: "1rem" }}>このパートに問題データがありません。</p>
        <button onClick={() => router.push("/")} style={{ padding: "0.6rem 1.5rem", borderRadius: "0.5rem", border: "none", background: "var(--app-accent)", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: "0.95rem" }}>
          トップへ戻る
        </button>
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: "6rem" }}>
      {/* Header */}
      <div style={{ marginBottom: "1.75rem" }}>
        <p style={{ fontSize: "0.82rem", color: "var(--muted-foreground)", marginBottom: "0.25rem" }}>{grade} / {lesson} / {part}</p>
        <h2 style={{ fontSize: "1.35rem", fontWeight: 800, color: "var(--app-accent)" }}>整序問題</h2>
        <p style={{ fontSize: "0.85rem", color: "var(--muted-foreground)" }}>単語をクリックして正しい順に並べてください</p>
      </div>

      {/* Score banner */}
      {scored && (
        <div style={{
          background: score === questions.length ? "var(--app-accent-dim, #d8f3dc)" : "#fff3cd",
          border: `1.5px solid ${score === questions.length ? "var(--app-accent-light, #52b788)" : "#ffc107"}`,
          borderRadius: "0.75rem",
          padding: "1rem 1.25rem",
          marginBottom: "1.5rem",
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
        }}>
          <span style={{ fontSize: "1.75rem" }}>{score === questions.length ? "🎉" : "📝"}</span>
          <div>
            <p style={{ fontWeight: 700, fontSize: "1.05rem", color: "var(--foreground)" }}>
              {score} / {questions.length} 正解
            </p>
            <p style={{ fontSize: "0.82rem", color: "var(--muted-foreground)" }}>
              {score === questions.length ? "全問正解！素晴らしい！" : "もう一度挑戦してみましょう"}
            </p>
          </div>
        </div>
      )}

      {/* Questions */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        {questions.map((q, qIdx) => {
          const isCorrect = scored ? results[qIdx] : undefined;
          return (
            <div
              key={q.item.id}
              style={{
                background: "var(--card)",
                border: `1.5px solid ${isCorrect === true ? "#52b788" : isCorrect === false ? "#e63946" : "var(--border)"}`,
                borderRadius: "0.75rem",
                padding: "1.25rem",
              }}
            >
              {/* Question header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
                <div>
                  <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--app-accent)", background: "var(--app-accent-dim, #d8f3dc)", padding: "0.15rem 0.6rem", borderRadius: "9999px" }}>
                    Q{qIdx + 1}
                  </span>
                  {q.item.title && (
                    <span style={{ fontSize: "0.78rem", color: "var(--muted-foreground)", marginLeft: "0.5rem" }}>{q.item.title}</span>
                  )}
                </div>
                {!scored && (
                  <button
                    onClick={() => resetQuestion(qIdx)}
                    style={{ fontSize: "0.78rem", color: "var(--muted-foreground)", background: "none", border: "1px solid var(--border)", borderRadius: "0.4rem", padding: "0.2rem 0.6rem", cursor: "pointer" }}
                  >
                    リセット
                  </button>
                )}
                {isCorrect === true && <span style={{ fontSize: "1.2rem" }}>✓</span>}
                {isCorrect === false && <span style={{ fontSize: "1.2rem" }}>✗</span>}
              </div>

              {/* Japanese translation */}
              {q.item.trans && (
                <p style={{ fontSize: "0.88rem", color: "var(--muted-foreground)", marginBottom: "1rem", padding: "0.5rem 0.75rem", background: "var(--muted)", borderRadius: "0.4rem" }}>
                  {q.item.trans}
                </p>
              )}

              {/* Answer zone */}
              <div style={{ marginBottom: "0.75rem" }}>
                <p style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--muted-foreground)", marginBottom: "0.4rem" }}>回答エリア</p>
                <div
                  style={{
                    minHeight: "3rem",
                    background: scored
                      ? (isCorrect ? "#f0faf4" : "#fff5f5")
                      : "#f8faf8",
                    border: `1.5px dashed ${scored ? (isCorrect ? "#52b788" : "#e63946") : "var(--app-accent-light, #52b788)"}`,
                    borderRadius: "0.5rem",
                    padding: "0.5rem 0.6rem",
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "0.4rem",
                    alignItems: "center",
                  }}
                >
                  {q.answer.length === 0 && (
                    <span style={{ fontSize: "0.82rem", color: "var(--muted-foreground)", fontStyle: "italic" }}>
                      ここに単語を並べてください
                    </span>
                  )}
                  {q.answer.map((token) => (
                    <span
                      key={token.id}
                      onClick={() => moveToBank(qIdx, token)}
                      style={{
                        ...chipBase,
                        background: scored
                          ? (isCorrect ? "#2d6a4f" : "#e63946")
                          : "var(--app-accent)",
                        color: "#fff",
                        borderColor: scored
                          ? (isCorrect ? "#1b4332" : "#c1121f")
                          : "var(--app-accent)",
                        cursor: scored ? "default" : "pointer",
                      }}
                    >
                      {token.word}
                    </span>
                  ))}
                </div>
              </div>

              {/* Word bank */}
              <div>
                <p style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--muted-foreground)", marginBottom: "0.4rem" }}>単語バンク</p>
                <div
                  style={{
                    minHeight: "2.5rem",
                    background: "var(--muted)",
                    borderRadius: "0.5rem",
                    padding: "0.5rem 0.6rem",
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "0.4rem",
                    alignItems: "center",
                  }}
                >
                  {q.bank.length === 0 && (
                    <span style={{ fontSize: "0.82rem", color: "var(--muted-foreground)", fontStyle: "italic" }}>
                      すべての単語を使いました
                    </span>
                  )}
                  {q.bank.map((token) => (
                    <span
                      key={token.id}
                      onClick={() => moveToAnswer(qIdx, token)}
                      style={{
                        ...chipBase,
                        background: "#fff",
                        color: "var(--foreground)",
                        borderColor: "var(--border)",
                        cursor: scored ? "default" : "pointer",
                      }}
                    >
                      {token.word}
                    </span>
                  ))}
                </div>
              </div>

              {/* Correct answer shown after wrong */}
              {scored && !isCorrect && (
                <div style={{ marginTop: "0.75rem", padding: "0.6rem 0.85rem", background: "#f0faf4", border: "1px solid #52b788", borderRadius: "0.5rem" }}>
                  <p style={{ fontSize: "0.78rem", fontWeight: 700, color: "#2d6a4f", marginBottom: "0.2rem" }}>正解</p>
                  <p style={{ fontSize: "0.92rem", fontFamily: "monospace", color: "#1b4332" }}>{q.item.sentence}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Fixed bottom bar */}
      <div style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        background: "rgba(255,255,255,0.95)",
        backdropFilter: "blur(8px)",
        borderTop: "1px solid var(--border)",
        padding: "0.85rem 1rem",
        display: "flex",
        gap: "0.75rem",
        justifyContent: "center",
        zIndex: 50,
      }}>
        {!scored ? (
          <button
            onClick={handleScore}
            style={{
              padding: "0.75rem 2.5rem",
              borderRadius: "0.65rem",
              border: "none",
              background: "var(--app-accent)",
              color: "#fff",
              fontSize: "1rem",
              fontWeight: 700,
              cursor: "pointer",
              letterSpacing: "0.04em",
            }}
          >
            採点する →
          </button>
        ) : (
          <>
            <button
              onClick={handleReset}
              style={{
                padding: "0.75rem 1.75rem",
                borderRadius: "0.65rem",
                border: "1.5px solid var(--app-accent)",
                background: "#fff",
                color: "var(--app-accent)",
                fontSize: "1rem",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              もう一度
            </button>
            <button
              onClick={() => router.push("/")}
              style={{
                padding: "0.75rem 1.75rem",
                borderRadius: "0.65rem",
                border: "none",
                background: "var(--app-accent)",
                color: "#fff",
                fontSize: "1rem",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              トップへ戻る
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function TestPage() {
  return (
    <Suspense fallback={<p style={{ color: "var(--muted-foreground)", textAlign: "center", marginTop: "3rem" }}>読み込み中…</p>}>
      <TestContent />
    </Suspense>
  );
}
