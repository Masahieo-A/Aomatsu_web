"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import type { ClozeTest } from "@/lib/types";

type CTMode = "tap" | "input";

// 末尾などの記号を取り除いた「中身」を返す（空欄判定・正誤判定に使用）
const PUNCT = /[.,?!"]/g;
function sanitize(word: string): string {
  return word.replace(PUNCT, "");
}

// 本文を /\s+/ で分割し、interval ごと（wordCount % interval === 0）かつ
// 記号を除いた中身が1文字以上あるトークンを空欄にする。元データは書き換えない。
type Token = { text: string; blank: boolean; index: number };
function tokenize(body: string, interval: number): Token[] {
  const words = body.split(/\s+/).filter((w) => w.length > 0);
  let blankIdx = -1;
  return words.map((word, i) => {
    const wordCount = i + 1;
    const isBlankPos = wordCount % interval === 0 && sanitize(word).length > 0;
    if (isBlankPos) blankIdx += 1;
    return { text: word, blank: isBlankPos, index: isBlankPos ? blankIdx : -1 };
  });
}

// 1つの空欄（タップ式 / 入力式）
function Blank({
  answer,
  mode,
  revealAll,
}: {
  answer: string;
  mode: CTMode;
  revealAll: boolean;
}) {
  const [revealed, setRevealed] = useState(false);
  const [value, setValue] = useState("");
  const [checked, setChecked] = useState<"correct" | "incorrect" | null>(null);

  // 「答え合わせ」一括操作
  useEffect(() => {
    if (!revealAll) {
      setRevealed(false);
      setChecked(null);
      return;
    }
    if (mode === "tap") {
      setRevealed(true);
    } else {
      const ok = sanitize(value).toLowerCase() === sanitize(answer).toLowerCase();
      setChecked(ok ? "correct" : "incorrect");
    }
  }, [revealAll, mode, answer, value]);

  if (mode === "tap") {
    return (
      <span
        onClick={() => setRevealed((r) => !r)}
        title="タップで表示/非表示"
        style={{
          display: "inline-block",
          minWidth: "3.5rem",
          textAlign: "center",
          padding: "0 0.35rem",
          margin: "0 0.15rem",
          borderRadius: "0.35rem",
          background: revealed ? "transparent" : "rgba(45,106,79,0.14)",
          color: revealed ? "#dc2626" : "transparent",
          fontWeight: revealed ? 700 : 400,
          cursor: "pointer",
          userSelect: "none",
          transition: "color 0.12s, background 0.12s",
          borderBottom: "2px solid var(--app-accent)",
        }}
      >
        {answer}
      </span>
    );
  }

  // input mode
  const checkSelf = () => {
    const ok = sanitize(value).toLowerCase() === sanitize(answer).toLowerCase();
    setChecked(ok ? "correct" : "incorrect");
  };

  const borderColor =
    checked === "correct" ? "#22c55e" : checked === "incorrect" ? "#ef4444" : "var(--border)";

  return (
    <span style={{ display: "inline-flex", alignItems: "center", margin: "0 0.2rem" }}>
      <input
        type="text"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setChecked(null);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            checkSelf();
          }
        }}
        placeholder="　"
        style={{
          width: `${Math.max(4, answer.length + 1)}ch`,
          minWidth: "3.5rem",
          borderTop: "none",
          borderLeft: "none",
          borderRight: "none",
          borderBottom: `2px solid ${borderColor}`,
          outline: "none",
          fontSize: "1rem",
          textAlign: "center",
          padding: "0 0.2rem",
          background:
            checked === "correct"
              ? "rgba(34,197,94,0.08)"
              : checked === "incorrect"
              ? "rgba(239,68,68,0.06)"
              : "transparent",
          color:
            checked === "correct"
              ? "#16a34a"
              : checked === "incorrect"
              ? "#dc2626"
              : "var(--foreground)",
          fontWeight: checked ? 600 : 400,
        }}
      />
      {checked === "incorrect" && (
        <span style={{ marginLeft: "0.35rem", fontSize: "0.85rem", color: "#dc2626", fontWeight: 700 }}>
          {answer}
        </span>
      )}
    </span>
  );
}

function ClozeContent() {
  const params = useSearchParams();
  const router = useRouter();
  const lesson = params.get("lesson") ?? "";
  const part = params.get("part") ?? "";

  const [questions, setQuestions] = useState<ClozeTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [mode, setMode] = useState<CTMode>("tap");
  const [interval, setIntervalVal] = useState(5);
  // mode / interval を変えるたびに空欄を作り直すための世代キー
  const [generation, setGeneration] = useState(0);
  const [revealAll, setRevealAll] = useState(false);

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

  const tokenized = useMemo(
    () => questions.map((q) => ({ q, tokens: tokenize(q.body, interval) })),
    [questions, interval]
  );

  const totalBlanks = useMemo(
    () => tokenized.reduce((sum, { tokens }) => sum + tokens.filter((t) => t.blank).length, 0),
    [tokenized]
  );

  const regenerate = (next: { mode?: CTMode; interval?: number }) => {
    if (next.mode) setMode(next.mode);
    if (next.interval) setIntervalVal(next.interval);
    setRevealAll(false);
    setGeneration((g) => g + 1);
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
      <div style={{ marginBottom: "1.25rem" }}>
        <button onClick={() => router.push("/")} style={{ ...backBtnStyle, marginBottom: "0.75rem" }}>
          ← 戻る
        </button>
        <h2 style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--app-accent)" }}>
          📝 クローズテスト
        </h2>
        <p style={{ fontSize: "0.85rem", color: "var(--muted-foreground)" }}>
          {lesson} / {part} — {questions.length} 問 / 空欄 {totalBlanks} 個
        </p>
      </div>

      {/* Controls */}
      <div
        style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: "0.75rem",
          padding: "1rem 1.1rem",
          marginBottom: "1.5rem",
          display: "flex",
          flexWrap: "wrap",
          gap: "1.25rem",
          alignItems: "center",
        }}
      >
        {/* Mode */}
        <div>
          <p style={labelStyle}>解答モード</p>
          <div style={{ display: "flex", gap: "0.4rem" }}>
            {([
              { id: "tap", label: "タップで表示" },
              { id: "input", label: "入力して採点" },
            ] as { id: CTMode; label: string }[]).map(({ id, label }) => (
              <button
                key={id}
                onClick={() => regenerate({ mode: id })}
                style={segBtnStyle(mode === id)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Difficulty */}
        <div>
          <p style={labelStyle}>空欄の頻度（難易度）</p>
          <div style={{ display: "flex", gap: "0.4rem" }}>
            {([
              { iv: 7, label: "やさしい" },
              { iv: 5, label: "ふつう" },
              { iv: 3, label: "むずかしい" },
            ]).map(({ iv, label }) => (
              <button
                key={iv}
                onClick={() => regenerate({ interval: iv })}
                style={segBtnStyle(interval === iv)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {mode === "tap" && (
        <p style={{ fontSize: "0.8rem", color: "var(--muted-foreground)", marginBottom: "1rem" }}>
          緑のマスをタップすると答えが見えます。
        </p>
      )}
      {mode === "input" && (
        <p style={{ fontSize: "0.8rem", color: "var(--muted-foreground)", marginBottom: "1rem" }}>
          空欄に入力して Enter で1問ずつ採点、または下の「答え合わせ」で一括採点。
        </p>
      )}

      {/* Question cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", marginBottom: "5rem" }}>
        {tokenized.map(({ q, tokens }, idx) => (
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
                    lineHeight: 2.4,
                    color: "var(--foreground)",
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                  }}
                >
                  {tokens.map((tok, ti) =>
                    tok.blank ? (
                      <Blank
                        key={`${generation}-${ti}`}
                        answer={tok.text}
                        mode={mode}
                        revealAll={revealAll}
                      />
                    ) : (
                      <span key={`${generation}-${ti}`} style={{ marginRight: "0.3rem" }}>
                        {tok.text}
                      </span>
                    )
                  )}
                </div>

                {q.trans && (
                  <p
                    style={{
                      fontSize: "0.82rem",
                      color: "var(--muted-foreground)",
                      marginTop: "0.5rem",
                      fontStyle: "italic",
                    }}
                  >
                    {q.trans}
                  </p>
                )}
              </div>
            </div>
          </div>
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
          gap: "0.75rem",
          justifyContent: "center",
          zIndex: 50,
        }}
      >
        {!revealAll ? (
          <button onClick={() => setRevealAll(true)} style={{ ...primaryBtnStyle, minWidth: "200px" }}>
            {mode === "tap" ? "すべて表示" : "答え合わせ"} →
          </button>
        ) : (
          <>
            <button onClick={() => regenerate({})} style={secondaryBtnStyle}>もう一度</button>
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

const labelStyle: React.CSSProperties = {
  fontSize: "0.72rem",
  fontWeight: 600,
  color: "var(--muted-foreground)",
  marginBottom: "0.4rem",
  letterSpacing: "0.02em",
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

function segBtnStyle(active: boolean): React.CSSProperties {
  return {
    padding: "0.4rem 0.8rem",
    borderRadius: "0.5rem",
    border: active ? "2px solid var(--app-accent)" : "1.5px solid var(--border)",
    background: active ? "rgba(45,106,79,0.08)" : "#fff",
    color: active ? "var(--app-accent)" : "var(--foreground)",
    fontSize: "0.85rem",
    fontWeight: active ? 700 : 500,
    cursor: "pointer",
    transition: "all 0.12s",
  };
}
