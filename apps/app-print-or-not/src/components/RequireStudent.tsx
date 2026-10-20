"use client";
// 記録（localStorage）の読み込みが終わるまで待ってから画面を出す
import { useStudent } from "@/lib/store";
import type { StudentState } from "@/lib/types";

export default function RequireStudent({ children }: { children: (s: StudentState) => React.ReactNode }) {
  const { ready, state } = useStudent();
  if (!ready || !state) return <div className="page muted">読み込み中…</div>;
  return <>{children(state)}</>;
}
