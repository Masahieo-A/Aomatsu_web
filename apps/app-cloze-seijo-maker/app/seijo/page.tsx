"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { SentenceRearrangement } from "@/lib/types";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

type Result = "correct" | "incorrect" | null;

type QuestionState = {
  question: SentenceRearrangement;
  bank: string[];
  answer: string[];
  result: Result;
};

function buildInitialState(q: SentenceRearrangement): QuestionState {
  return { question: q, bank: shuffle(q.sentence.split(" ")), answer: [], result: null };
}

// Where a word is being dragged from / dropped to.
type DragState = {
  from: "bank" | "answer";
  index: number;
  word: string;
  x: number;
  y: number;
  insertIndex: number | null; // insertion index inside the answer row
  overAnswer: boolean;
  overBank: boolean;
};

type DropPayload = {
  from: "bank" | "answer";
  index: number;
  word: string;
  insertIndex: number | null;
  overAnswer: boolean;
  overBank: boolean;
};

function SeijouContent() {
  const params = useSearchParams();
  const router = useRouter();
  const lesson = params.get("lesson") ?? "";
  const part = params.get("part") ?? "";

  const [states, setStates] = useState<QuestionState[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  const updateQuestion = useCallback(
    (qIdx: number, updater: (st: QuestionState) => QuestionState) => {
      setStates((prev) => {
        const next = [...prev];
        next[qIdx] = updater(next[qIdx]);
        return next;
      });
    },
    []
  );

  // Click: append bank word to the end of the answer row.
  const bankClick = useCallback(
    (qIdx: number, bankIdx: number) => {
      updateQuestion(qIdx, (st) => {
        if (st.result) return st;
        const bank = [...st.bank];
        const [word] = bank.splice(bankIdx, 1);
        return { ...st, bank, answer: [...st.answer, word] };
      });
    },
    [updateQuestion]
  );

  // Click: send an answer word back to the bank.
  const answerClick = useCallback(
    (qIdx: number, ansIdx: number) => {
      updateQuestion(qIdx, (st) => {
        if (st.result) return st;
        const answer = [...st.answer];
        const [word] = answer.splice(ansIdx, 1);
        return { ...st, answer, bank: [...st.bank, word] };
      });
    },
    [updateQuestion]
  );

  // Drag-and-drop: insert / reorder / remove.
  const handleDrop = useCallback(
    (qIdx: number, d: DropPayload) => {
      updateQuestion(qIdx, (st) => {
        if (st.result) return st;
        const bank = [...st.bank];
        const answer = [...st.answer];

        // Dropped onto the bank → remove from answer.
        if (d.overBank) {
          if (d.from === "answer") {
            const [word] = answer.splice(d.index, 1);
            bank.push(word);
          }
          return { ...st, bank, answer };
        }

        // Dropped outside both zones → cancel.
        if (!d.overAnswer) return st;

        let insert = d.insertIndex == null ? answer.length : d.insertIndex;

        if (d.from === "bank") {
          const [word] = bank.splice(d.index, 1);
          answer.splice(insert, 0, word);
        } else {
          const [word] = answer.splice(d.index, 1);
          if (insert > d.index) insert -= 1;
          answer.splice(insert, 0, word);
        }
        return { ...st, bank, answer };
      });
    },
    [updateQuestion]
  );

  const scoreQuestion = useCallback(
    (qIdx: number) => {
      updateQuestion(qIdx, (st) => ({
        ...st,
        result:
          st.answer.join(" ").trim().toLowerCase() ===
          st.question.sentence.trim().toLowerCase()
            ? "correct"
            : "incorrect",
      }));
    },
    [updateQuestion]
  );

  // Clear the result but keep the current arrangement so it can be drag-fixed.
  const retryQuestion = useCallback(
    (qIdx: number) => {
      updateQuestion(qIdx, (st) => ({ ...st, result: null }));
    },
    [updateQuestion]
  );

  // Reshuffle a single question from scratch.
  const resetQuestion = useCallback(
    (qIdx: number) => {
      updateQuestion(qIdx, (st) => buildInitialState(st.question));
    },
    [updateQuestion]
  );

  const handleResetAll = () => {
    setStates((prev) => prev.map((st) => buildInitialState(st.question)));
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

  const answeredCount = states.filter((s) => s.result).length;
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
        <p style={{ fontSize: "0.78rem", color: "var(--muted-foreground)", marginTop: "0.35rem" }}>
          💡 タップで単語を移動。ドラッグで好きな位置に挿入・並べ替え・削除できます。
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", marginBottom: "5rem" }}>
        {states.map((st, qIdx) => (
          <QuestionCard
            key={st.question.id}
            index={qIdx}
            state={st}
            onBankClick={(i) => bankClick(qIdx, i)}
            onAnswerClick={(i) => answerClick(qIdx, i)}
            onDrop={(d) => handleDrop(qIdx, d)}
            onScore={() => scoreQuestion(qIdx)}
            onRetry={() => retryQuestion(qIdx)}
            onReset={() => resetQuestion(qIdx)}
          />
        ))}
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
          alignItems: "center",
          gap: "0.75rem",
          justifyContent: "center",
          flexWrap: "wrap",
          zIndex: 50,
        }}
      >
        <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--app-accent)" }}>
          解答済み {answeredCount} / {states.length}　正解 {correctCount}
        </span>
        <button onClick={handleResetAll} style={secondaryBtnStyle}>すべてリセット</button>
        <button onClick={() => router.push("/")} style={secondaryBtnStyle}>トップへ戻る</button>
      </div>
    </div>
  );
}

function QuestionCard({
  index,
  state: st,
  onBankClick,
  onAnswerClick,
  onDrop,
  onScore,
  onRetry,
  onReset,
}: {
  index: number;
  state: QuestionState;
  onBankClick: (i: number) => void;
  onAnswerClick: (i: number) => void;
  onDrop: (d: DropPayload) => void;
  onScore: () => void;
  onRetry: () => void;
  onReset: () => void;
}) {
  const locked = st.result !== null;
  const answerRef = useRef<HTMLDivElement>(null);
  const bankRef = useRef<HTMLDivElement>(null);

  const [drag, setDrag] = useState<DragState | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const downRef = useRef<{
    x: number;
    y: number;
    from: "bank" | "answer";
    index: number;
    word: string;
  } | null>(null);

  const DRAG_THRESHOLD = 6;

  const computeInsertIndex = (px: number, py: number): number => {
    const el = answerRef.current;
    if (!el) return 0;
    const chips = Array.from(el.querySelectorAll<HTMLElement>("[data-chip='answer']"));
    let idx = chips.length;
    for (let i = 0; i < chips.length; i++) {
      const r = chips[i].getBoundingClientRect();
      const inRow = py >= r.top && py <= r.bottom;
      if (inRow) {
        if (px < r.left + r.width / 2) {
          idx = i;
          break;
        }
      } else if (py < r.top) {
        idx = i;
        break;
      }
    }
    return idx;
  };

  const handleMove = useCallback((e: PointerEvent) => {
    const down = downRef.current;
    if (!down) return;

    if (!dragRef.current) {
      const dist = Math.hypot(e.clientX - down.x, e.clientY - down.y);
      if (dist < DRAG_THRESHOLD) return;
      dragRef.current = {
        from: down.from,
        index: down.index,
        word: down.word,
        x: e.clientX,
        y: e.clientY,
        insertIndex: null,
        overAnswer: false,
        overBank: false,
      };
    }

    const px = e.clientX;
    const py = e.clientY;

    const inside = (ref: React.RefObject<HTMLDivElement | null>) => {
      const node = ref.current;
      if (!node) return false;
      const r = node.getBoundingClientRect();
      return px >= r.left && px <= r.right && py >= r.top && py <= r.bottom;
    };

    const overBank = inside(bankRef);
    const overAnswer = !overBank && inside(answerRef);
    const insertIndex = overAnswer ? computeInsertIndex(px, py) : null;

    const nd: DragState = {
      ...dragRef.current,
      x: px,
      y: py,
      insertIndex,
      overAnswer,
      overBank,
    };
    dragRef.current = nd;
    setDrag(nd);
    e.preventDefault();
  }, []);

  const handleUp = useCallback(() => {
    window.removeEventListener("pointermove", handleMove);
    window.removeEventListener("pointerup", handleUp);
    window.removeEventListener("pointercancel", handleUp);

    const d = dragRef.current;
    const down = downRef.current;
    dragRef.current = null;
    downRef.current = null;
    setDrag(null);

    if (!d) {
      // No drag happened → treat as a click.
      if (down) {
        if (down.from === "bank") onBankClick(down.index);
        else onAnswerClick(down.index);
      }
      return;
    }

    onDrop({
      from: d.from,
      index: d.index,
      word: d.word,
      insertIndex: d.insertIndex,
      overAnswer: d.overAnswer,
      overBank: d.overBank,
    });
  }, [handleMove, onBankClick, onAnswerClick, onDrop]);

  const startDrag = (
    e: React.PointerEvent,
    from: "bank" | "answer",
    i: number,
    word: string
  ) => {
    if (locked) return;
    downRef.current = { x: e.clientX, y: e.clientY, from, index: i, word };
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    window.addEventListener("pointercancel", handleUp);
  };

  const resultColor =
    st.result === "correct" ? "#22c55e" : st.result === "incorrect" ? "#ef4444" : undefined;

  const dragActive = drag !== null;
  const insertIndex = drag?.overAnswer ? drag.insertIndex : null;

  const indicator = (
    <span
      key="indicator"
      style={{
        display: "inline-block",
        width: "3px",
        alignSelf: "stretch",
        minHeight: "1.6rem",
        borderRadius: "2px",
        background: "var(--app-accent)",
      }}
    />
  );

  return (
    <div style={{ ...cardStyle, borderColor: st.result ? resultColor : "var(--border)" }}>
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
            {st.result === "correct" ? "✓" : st.result === "incorrect" ? "✗" : index + 1}
          </span>
          {st.question.trans && (
            <span style={{ fontSize: "0.85rem", color: "var(--muted-foreground)", fontStyle: "italic" }}>
              {st.question.trans}
            </span>
          )}
        </div>
        <button onClick={onReset} style={smallBtnStyle}>
          リセット
        </button>
      </div>

      {/* Answer zone */}
      <div style={{ marginBottom: "0.75rem" }}>
        <p style={{ fontSize: "0.75rem", color: "var(--muted-foreground)", marginBottom: "0.4rem", fontWeight: 600 }}>
          回答エリア（タップで戻す・ドラッグで挿入/並べ替え）
        </p>
        <div
          ref={answerRef}
          style={{
            minHeight: "2.5rem",
            border: "2px dashed",
            borderColor: st.result
              ? resultColor
              : drag?.overAnswer
              ? "var(--app-accent)"
              : st.answer.length > 0
              ? "var(--app-accent)"
              : "var(--border)",
            borderRadius: "0.5rem",
            padding: "0.4rem 0.5rem",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: "0.4rem",
            background:
              st.result === "correct"
                ? "rgba(34,197,94,0.04)"
                : st.result === "incorrect"
                ? "rgba(239,68,68,0.04)"
                : "transparent",
          }}
        >
          {st.answer.length === 0 && insertIndex == null && (
            <span style={{ color: "var(--muted-foreground)", fontSize: "0.85rem", alignSelf: "center", paddingLeft: "0.25rem" }}>
              ここに単語を並べよう
            </span>
          )}
          {st.answer.map((word, wi) => {
            const isDragSource = dragActive && drag?.from === "answer" && drag.index === wi;
            return (
              <span key={`a-${wi}`} style={{ display: "contents" }}>
                {insertIndex === wi && indicator}
                <button
                  type="button"
                  data-chip="answer"
                  onPointerDown={(e) => startDrag(e, "answer", wi, word)}
                  disabled={locked}
                  style={{
                    ...chipStyle(true, locked, st.result),
                    opacity: isDragSource ? 0.35 : 1,
                  }}
                >
                  {word}
                </button>
              </span>
            );
          })}
          {insertIndex === st.answer.length && indicator}
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
      <div style={{ marginBottom: "1rem" }}>
        <p style={{ fontSize: "0.75rem", color: "var(--muted-foreground)", marginBottom: "0.4rem", fontWeight: 600 }}>
          単語バンク（タップで選ぶ・ドラッグで挿入／ここへ戻して削除）
        </p>
        <div
          ref={bankRef}
          style={{
            minHeight: "2.5rem",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: "0.4rem",
            borderRadius: "0.5rem",
            padding: "0.25rem",
            outline: drag?.overBank ? "2px dashed var(--app-accent)" : "none",
            outlineOffset: "2px",
          }}
        >
          {st.bank.length === 0 && !locked && !drag?.overBank && (
            <span style={{ color: "var(--muted-foreground)", fontSize: "0.85rem" }}>全部使った！</span>
          )}
          {st.bank.map((word, wi) => {
            const isDragSource = dragActive && drag?.from === "bank" && drag.index === wi;
            return (
              <button
                key={`b-${wi}`}
                type="button"
                data-chip="bank"
                onPointerDown={(e) => startDrag(e, "bank", wi, word)}
                disabled={locked}
                style={{
                  ...chipStyle(false, locked, null),
                  opacity: isDragSource ? 0.35 : 1,
                }}
              >
                {word}
              </button>
            );
          })}
        </div>
      </div>

      {/* Per-question actions */}
      {!locked ? (
        <button
          onClick={onScore}
          disabled={st.answer.length === 0}
          style={{
            ...primaryBtnStyle,
            width: "100%",
            opacity: st.answer.length === 0 ? 0.5 : 1,
            cursor: st.answer.length === 0 ? "default" : "pointer",
          }}
        >
          解答する
        </button>
      ) : (
        <div style={{ display: "flex", gap: "0.6rem" }}>
          <button onClick={onRetry} style={{ ...secondaryBtnStyle, flex: 1 }}>
            やり直す
          </button>
          <button onClick={onReset} style={{ ...secondaryBtnStyle, flex: 1 }}>
            シャッフル
          </button>
        </div>
      )}

      {/* Floating drag ghost */}
      {drag && (
        <span
          style={{
            position: "fixed",
            left: drag.x,
            top: drag.y,
            transform: "translate(-50%, -50%)",
            pointerEvents: "none",
            zIndex: 100,
            ...chipStyle(true, false, null),
            boxShadow: "0 6px 16px rgba(0,0,0,0.25)",
          }}
        >
          {drag.word}
        </span>
      )}
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

const smallBtnStyle: React.CSSProperties = {
  background: "none",
  border: "1px solid var(--border)",
  borderRadius: "0.4rem",
  padding: "0.2rem 0.6rem",
  fontSize: "0.78rem",
  color: "var(--muted-foreground)",
  cursor: "pointer",
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
  padding: "0.6rem 1.25rem",
  borderRadius: "0.6rem",
  border: "1.5px solid var(--border)",
  background: "#fff",
  color: "var(--foreground)",
  fontSize: "0.9rem",
  fontWeight: 600,
  cursor: "pointer",
};

function chipStyle(
  inAnswer: boolean,
  disabled: boolean,
  result: Result
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
    cursor: disabled ? "default" : "grab",
    transition: "opacity 0.12s",
    whiteSpace: "nowrap",
    touchAction: "none",
    userSelect: "none",
  };
}
