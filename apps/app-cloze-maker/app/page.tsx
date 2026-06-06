"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ClozeTest } from "@/lib/types";
import LessonSelector from "@/components/LessonSelector";

export default function HomePage() {
  const router = useRouter();
  const [data, setData] = useState<ClozeTest[]>([]);
  const [grade, setGrade] = useState("");
  const [lesson, setLesson] = useState("");
  const [part, setPart] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/data/cloze.json")
      .then((r) => r.json() as Promise<ClozeTest[]>)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const grades = useMemo(() => Array.from(new Set(data.map((d) => d.grade))).sort(), [data]);
  const lessons = useMemo(() => {
    if (!grade) return [];
    return Array.from(new Set(data.filter((d) => d.grade === grade).map((d) => d.lesson))).sort();
  }, [data, grade]);
  const parts = useMemo(() => {
    if (!grade || !lesson) return [];
    return Array.from(
      new Set(data.filter((d) => d.grade === grade && d.lesson === lesson).map((d) => d.part))
    ).sort();
  }, [data, grade, lesson]);

  useEffect(() => { setLesson(""); setPart(""); }, [grade]);
  useEffect(() => { setPart(""); }, [lesson]);

  const canStart = grade && lesson && part;

  return (
    <div style={{ maxWidth: 560, margin: "0 auto" }}>
      <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
        <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>📝</div>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--app-accent)", marginBottom: "0.4rem" }}>
          Cloze Test Maker
        </h1>
        <p style={{ color: "var(--muted-foreground)", fontSize: "0.9rem" }}>
          レッスンとパートを選んで穴埋め問題に挑戦
        </p>
      </div>

      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "0.75rem", padding: "1.5rem", marginBottom: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
        {loading ? (
          <p style={{ color: "var(--muted-foreground)", textAlign: "center", fontSize: "0.9rem" }}>読み込み中…</p>
        ) : lessons.length === 0 ? (
          <p style={{ color: "var(--muted-foreground)", textAlign: "center", fontSize: "0.9rem" }}>データがまだ登録されていません。</p>
        ) : (
          <>
            <LessonSelector label="学年" options={grades} value={grade} onChange={setGrade} />
            <LessonSelector label="レッスン" options={lessons} value={lesson} onChange={setLesson} disabled={!grade} />
            <LessonSelector label="パート" options={parts} value={part} onChange={setPart} disabled={!lesson} />
          </>
        )}
      </div>

      <button
        onClick={() => { if (canStart) router.push(`/test?grade=${encodeURIComponent(grade)}&lesson=${encodeURIComponent(lesson)}&part=${encodeURIComponent(part)}`); }}
        disabled={!canStart}
        style={{
          width: "100%", padding: "1rem", borderRadius: "0.75rem", border: "none",
          background: canStart ? "var(--app-accent)" : "var(--muted)",
          color: canStart ? "#fff" : "var(--muted-foreground)",
          fontSize: "1.1rem", fontWeight: 700, cursor: canStart ? "pointer" : "not-allowed",
          transition: "background 0.15s", letterSpacing: "0.04em",
        }}
      >
        スタート →
      </button>
    </div>
  );
}
