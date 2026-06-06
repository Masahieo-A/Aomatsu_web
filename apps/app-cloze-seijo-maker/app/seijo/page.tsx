"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import type { SentenceRearrangement } from "@/lib/types";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

type QuestionState = {
  question: SentenceRearrangement;
  bank: string[];
  answer: string[];
  result: "correct" | "incorrect" | null;
};

function buildInitialState(q: SentenceRearrangement): QuestionState {
  return { question: q, bank: shuffle(q.sentence.split(" ")), answer: [], result: null };
}

function SeijouContent() {
  const params = useSearchParams();
  const router = useRouter();
  const lesson = params.get("lesson") ?? "";
  const part = params.get("part") ?? "";

  const [states, setStates] = useState<QuestionState[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [scored, setScored] = useState(false);

  useEffect(() => {
    if (!lesson || !part) return;
    fetch("/data/seijo.json")
      .then((r) => r.json() as Promise<SentenceRearrangement[]>)
      .then((all) => {
        const filtered = all
          .filter((q) => q.lesson === lesson && q.part === part)
          .sort((a, b) => a.seq - b.seq);
        setStates(filtered.map(buildInitialState));
      })
      .catch(() => setError("問題の読み込みに失敗しました。"))
      .finally(() => setLoading(false));
  }, [lesson, part]);

  const moveToAnswer = useCallback((qIdx: number, wordIdx: number) => {
    if (scored) return;
    setStates((prev) => {
      const next = [...prev];
      const st = { ...next[qIdx] };
      const word = st.bank[wordIdx];
      st.bank = st.bank.filter((_, i) => i !== wordIdx);
      st.answer = [...st.answer, word];
      next[qIdx] = st;
      return next;
    });
  }, [scored]);

  const moveToBank = useCallback((qIdx: number, wordIdx: number) => {
    if (scored) return;
    setStates((prev) => {
      const next = [...prev];
      const st = { ...next[qIdx] };
      const word = st.answer[wordIdx];
      st.answer = st.answer.filter((_, i) => i !== wordIdx);
      st.bank = [...st.bank, word];
      next[qIdx] = st;
      return next;
    });
  }, [scored]);

  const resetQuestion = useCallback((qIdx: number) => {
    setStates((prev) => {
      const next = [...prev];
      next[qIdx] = buildInitialState(next[qIdx].question);
      return next;
    });
    setScored(false);
  }, []);

  const handleScore = () => {
    setStates((prev) =>
      prev.map((st) => ({
        ...st,
        result:
          st.answer.join(" ").trim().toLowerCase() ===
          st.question.sentence.trim().toLowerCase()
            ? "correct"
            : "incorrect",
      }))
    );
    setScored(true);
  };

  const handleResetAll = () => {
    setStates((prev) => prev.map((st) => buildInitialState(st.question)));
    setScored(false);
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

  if (states.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "2rem" }}>
        <p style={{ color: "var(--muted-foreground)" }}>この範囲の問題はありません。</p>
        <button onClick={() => router.push("/")} style={backBtnStyle}>← トップへ戻る</button>
      </div>
    );
  }

  const correctCount = states.filter((s) => s.result === "correct").length;

  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <button onClick={() => router.push("/")} style={{ ...backBtnStyle, marginBottom: "0.75rem" }}>
          ← 戻る
        </button>
        <h2 style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--app-accent)" }}>
          🔀 整序問題
        </h2>
        <p style={{ fontSize: "0.85rem", color: "var(--muted-foreground)" }}>
          {lesson} / {part} — {states.length} 問
        </p>
      </div>

      {scored && (
        <div
          style={{
            background: "rgba(45,106,79,0.08)",
            border: "1.5px solid var(--app-accent)",
            borderRadius: "0.75rem",
            padding: "0.85rem 1.25rem",
            marginBottom: "1.5rem",
            fontWeight: 700,
            color: "var(--app-accent)",
            fontSize: "1rem",
            textAlign: "center",
          }}
        >
          採点結果: {correctCount} / {states.length} 問正解 🎉
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", marginBottom: "5rem" }}>
        {states.map((st, qIdx) => {
          const resultColor =
            st.result === "correct" ? "#22c55e" : st.result === "incorrect" ? "#ef4444" : undefined;

          return (
            <div
              key={st.question.id}
              style={{
                ...cardStyle,
                borderColor: st.result ? resultColor : "var(--border)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "1rem",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                  <span
                    style={{
                      width: "2rem",
                      height: "2rem",
                      borderRadius: "50%",
                      background: st.result ? resultColor : "var(--app-accent)",
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                      fontSize: "0.9rem",
                      flexShrink: 0,
                    }}
                  >
                    {st.result === "correct" ? "✓" : st.result === "incorrect" ? "✗" : qIdx + 1}
                  </span>
                  {st.question.trans && (
                    <span style={{ fontSize: "0.85rem", color: "var(--muted-foreground)", fontStyle: "italic" }}>
                      {st.question.trans}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => resetQuestion(qIdx)}
                  style={{
                    background: "none",
                    border: "1px solid var(--border)",
                    borderRadius: "0.4rem",
                    padding: "0.2rem 0.6rem",
                    fontSize: "0.78rem",
                    color: "var(--muted-foreground)",
                    cursor: "pointer",
                  }}
                >
                  リセット
                </button>
              </div>

              {/* Answer zone */}
              <div style={{ marginBottom: "0.75rem" }}>
                <p style={{ fontSize: "0.75rem", color: "var(--muted-foreground)", marginBottom: "0.4rem", fontWeight: 600 }}>
                  回答エリア（クリックで戻す）
                </p>
                <div
                  style={{
                    minHeight: "2.5rem",
                    border: "2px dashed",
                    borderColor: st.result
                      ? resultColor
                      : st.answer.length > 0
                      ? "var(--app-accent)"
                      : "var(--border)",
                    borderRadius: "0.5rem",
                    padding: "0.4rem 0.5rem",
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "0.4rem",
                    background:
                      st.result === "correct"
                        ? "rgba(34,197,94,0.04)"
                        : st.result === "incorrect"
                        ? "rgba(239,68,68,0.04)"
                        : "transparent",
                  }}
                >
                  {st.answer.length === 0 && (
                    <span style={{ color: "var(--muted-foreground)", fontSize: "0.85rem", alignSelf: "center", paddingLeft: "0.25rem" }}>
                      ここに単語を並べよう
                    </span>
                  )}
                  {st.answer.map((word, wi) => (
                    <button
                      key={`a-${wi}`}
                      onClick={() => moveToBank(qIdx, wi)}
                      disabled={scored}
                      style={chipStyle(true, scored, st.result)}
                    >
                      {word}
                    </button>
                  ))}
                </div>
              </div>

              {st.result === "incorrect" && (
                <div style={{ marginBottom: "0.75rem" }}>
                  <p style={{ fontSize: "0.75rem", color: "#ef4444", marginBottom: "0.25rem", fontWeight: 600 }}>
                    正解：
                  </p>
                  <p style={{ fontSize: "0.9rem", color: "#dc2626", fontWeight: 600 }}>
                    {st.question.sentence}
                  </p>
                </div>
              )}

              {/* Word bank */}
              <div>
                <p style={{ fontSize: "0.75rem", color: "var(--muted-foreground)", marginBottom: "0.4rem", fontWeight: 600 }}>
                  単語バンク（クリックして選ぶ）
                </p>
                <div style={{ minHeight: "2.5rem", display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                  {st.bank.length === 0 && !scored && (
                    <span style={{ color: "var(--muted-foreground)", fontSize: "0.85rem" }}>全部使った！</span>
                  )}
                  {st.bank.map((word, wi) => (
                    <button
                      key={`b-${wi}`}
                      onClick={() => moveToAnswer(qIdx, wi)}
                      disabled={scored}
                      style={chipStyle(false, scored, null)}
                    >
                      {word}
                    </button>
                  ))}
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
        {!scored ? (
          <button onClick={handleScore} style={{ ...primaryBtnStyle, minWidth: "200px" }}>
            採点する →
          </button>
        ) : (
          <>
            <button onClick={handleResetAll} style={secondaryBtnStyle}>もう一度</button>
            <button onClick={() => router.push("/")} style={secondaryBtnStyle}>トップへ戻る</button>
          </>
        )}
      </div>
    </div>
  );
}

export default function SeijouPage() {
  return (
    <Suspense
      fallback={
        <div style={{ textAlign: "center", padding: "3rem", color: "var(--muted-foreground)" }}>
          読み込み中…
        </div>
      }
    >
      <SeijouContent />
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

function chipStyle(
  inAnswer: boolean,
  disabled: boolean,
  result: "correct" | "incorrect" | null
): React.CSSProperties {
  let bg = inAnswer ? "var(--app-accent)" : "#fff";
  let color = inAnswer ? "#fff" : "var(--foreground)";
  let border = inAnswer ? "1.5px solid var(--app-accent)" : "1.5px solid var(--border)";

  if (result === "correct") {
    bg = "#22c55e"; color = "#fff"; border = "1.5px solid #22c55e";
  } else if (result === "incorrect" && inAnswer) {
    bg = "#ef4444"; color = "#fff"; border = "1.5px solid #ef4444";
  }

  return {
    padding: "0.3rem 0.75rem",
    borderRadius: "9999px",
    border,
    background: bg,
    color,
    fontSize: "0.9rem",
    fontWeight: 500,
    cursor: disabled ? "default" : "pointer",
    transition: "all 0.15s",
    whiteSpace: "nowrap",
  };
}
