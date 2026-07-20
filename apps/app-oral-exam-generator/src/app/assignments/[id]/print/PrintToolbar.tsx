"use client";

import Link from "next/link";

export function PrintToolbar({
  assignmentId,
  view,
}: {
  assignmentId: string;
  view: "sheets" | "key";
}) {
  return (
    <div className="no-print sticky top-0 z-10 flex items-center gap-3 border-b border-slate-200 bg-white/90 px-6 py-3 backdrop-blur">
      <Link href="/" className="text-sm text-slate-500 hover:underline">
        ← 課題・提出管理へ
      </Link>
      <span className="ml-2 text-sm font-semibold">
        {view === "key" ? "採点キー（教員用）" : "テストプリント（生徒配布用）"}
      </span>
      <div className="ml-auto flex items-center gap-2">
        <Link
          href={`/assignments/${assignmentId}/print${view === "key" ? "" : "?view=key"}`}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-100"
        >
          {view === "key" ? "プリントを表示" : "採点キーを表示"}
        </Link>
        <button
          onClick={() => window.print()}
          className="rounded-md bg-[#2d6a4f] px-4 py-1.5 text-sm font-medium text-white hover:bg-[#1f5238]"
        >
          印刷（PDF保存）
        </button>
      </div>
    </div>
  );
}
