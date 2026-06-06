"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ClozeTest, SentenceRearrangement } from "@/lib/types";
import LessonSelector from "@/components/LessonSelector";

type Mode = "cloze" | "seijo";

export default function HomePage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode | null>(null);
  const [allCloze, setAllCloze] = useState<ClozeTest[]>([]);
  const [allSeijo, setAllSeijo] = useState<SentenceRearrangement[]>([]);
  const [lesson, setLesson] = useState("");
  const [part, setPart] = useState("");
  const [loading, setLoading] = useState(true);

  // 起動時に両 JSON を一括取得（静的ファイル→CDN配信で高速）
  useEffect(() => {
    Promise.all([
      fetch("/data/cloze.json").then((r) => r.json() as Promise<ClozeTest[]>),
      fetch("/data/seijo.json").then((r) => r.json() as Promise<SentenceRearrangement[]>),
    ])
      .then(([cloze, seijo]) => {
        setAllCloze(cloze);
        setAllSeijo(seijo);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const lessons = useMemo(() => {
    const all = [
      ...allCloze.map((d) => d.lesson),
      ...allSeijo.map((d) => d.lesson),
    ];
    return Array.from(new Set(all)).sort();
  }, [allCloze, allSeijo]);

  const parts = useMemo(() => {
    if (!lesson) return [];
    const all = [
      ...allCloze.filter((d) => d.lesson === lesson).map((d) => d.part),
      ...allSeijo.filter((d) => d.lesson === lesson).map((d) => d.part),
    ];
    return Array.from(new Set(all)).sort();
  }, [allCloze, allSeijo, lesson]);

  // lesson が変わったら part をリセット
  useEffect(() => { setPart(""); }, [lesson]);

  const canStart = mode && lesson && part;

  const handleStart = () => {
    if (!canStart) return;
    const params = new URLSearchParams({ lesson, part });
    router.push(`/${mode}?${params.toString()}`);
  };

  return (
    <div style={{ maxWidth: 640, margin: "0 auto" }}>
      {/* Title */}
      <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
        <h1
          style={{
            fontSize: "1.75rem",
            fontWeight: 800,
            color: "var(--app-accent)",
            marginBottom: "0.4rem",
          }}
        >
          クローズ &amp; 整序テスト
        </h1>
        <p style={{ color: "var(--muted-foreground)", fontSize: "0.9rem" }}>
          モードを選んで、レッスンとパートを選択してスタート
        </p>
      </div>

      {/* Mode Selection */}
      <div style={{ marginBottom: "2rem" }}>
        <p
          style={{
            fontSize: "0.85rem",
            fontWeight: 600,
            color: "var(--muted-foreground)",
            marginBottom: "0.75rem",
            letterSpacing: "0.03em",
          }}
        >
          モードを選択
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          {(
            [
              { id: "cloze", icon: "📝", label: "クローズテスト", desc: "空欄に単語を入力" },
              { id: "seijo", icon: "🔀", label: "整序問題", desc: "単語を並べ替えて文を作る" },
            ] as { id: Mode; icon: string; label: string; desc: string }[]
          ).map(({ id, icon, label, desc }) => {
            const selected = mode === id;
            return (
              <button
                key={id}
                onClick={() => setMode(id)}
                style={{
                  padding: "1.25rem 1rem",
                  borderRadius: "0.75rem",
                  border: selected
                    ? "2.5px solid var(--app-accent)"
                    : "2px solid var(--border)",
                  background: selected ? "rgba(45,106,79,0.06)" : "#fff",
                  cursor: "pointer",
                  textAlign: "center",
                  transition: "all 0.15s",
                  boxShadow: selected ? "0 0 0 3px rgba(45,106,79,0.12)" : "none",
                }}
              >
                <div style={{ fontSize: "2rem", marginBottom: "0.4rem" }}>{icon}</div>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: "1rem",
                    color: selected ? "var(--app-accent)" : "var(--foreground)",
                    marginBottom: "0.25rem",
                  }}
                >
                  {label}
                </div>
                <div style={{ fontSize: "0.8rem", color: "var(--muted-foreground)" }}>
                  {desc}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Lesson & Part */}
      <div
        style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: "0.75rem",
          padding: "1.5rem",
          marginBottom: "1.5rem",
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
        }}
      >
        {loading ? (
          <p style={{ color: "var(--muted-foreground)", fontSize: "0.9rem", textAlign: "center" }}>
            レッスン情報を読み込み中…
          </p>
        ) : lessons.length === 0 ? (
          <p style={{ color: "var(--muted-foreground)", fontSize: "0.9rem", textAlign: "center" }}>
            データがまだ登録されていません。
          </p>
        ) : (
          <>
            <LessonSelector
              label="レッスン"
              options={lessons}
              value={lesson}
              onChange={setLesson}
            />
            <LessonSelector
              label="パート"
              options={parts}
              value={part}
              onChange={setPart}
              disabled={!lesson}
            />
          </>
        )}
      </div>

      {/* Start Button */}
      <button
        onClick={handleStart}
        disabled={!canStart}
        style={{
          width: "100%",
          padding: "1rem",
          borderRadius: "0.75rem",
          border: "none",
          background: canStart ? "var(--app-accent)" : "var(--muted)",
          color: canStart ? "#fff" : "var(--muted-foreground)",
          fontSize: "1.1rem",
          fontWeight: 700,
          cursor: canStart ? "pointer" : "not-allowed",
          transition: "background 0.15s",
          letterSpacing: "0.04em",
        }}
      >
        スタート →
      </button>

    </div>
  );
}
