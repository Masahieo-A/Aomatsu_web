"use client";
// 出席番号を入力していない状態で各画面を開いたら、スタート画面へ戻す
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStudent } from "@/lib/store";
import type { StudentState } from "@/lib/types";

export default function RequireStudent({ children }: { children: (s: StudentState) => React.ReactNode }) {
  const { ready, state } = useStudent();
  const router = useRouter();
  useEffect(() => {
    if (ready && !state) router.replace("/");
  }, [ready, state, router]);
  if (!ready || !state) return <div className="page muted">読み込み中…</div>;
  return <>{children(state)}</>;
}
