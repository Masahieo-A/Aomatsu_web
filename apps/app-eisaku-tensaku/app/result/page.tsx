"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { buttonVariants } from "@/components/ui/button";
import { ResultDisplay } from "@/components/ResultDisplay";
import { cn } from "@/lib/utils";
import {
  loadEvaluationFromSession,
  type EvaluationPayload,
} from "@/lib/store";

/**
 * 結果画面（/result）— sessionStorage に保存した添削結果を表示
 */
export default function ResultPage() {
  const [data, setData] = useState<EvaluationPayload | null | undefined>(
    undefined
  );

  useEffect(() => {
    setData(loadEvaluationFromSession());
  }, []);

  if (data === undefined) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4">
        <p className="text-muted-foreground">読み込み中…</p>
      </main>
    );
  }

  if (data === null) {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-6 bg-background px-4 py-12 text-center">
        <p className="text-foreground">添削データがありません。</p>
        <Link
          href="/"
          className={cn(
            buttonVariants({ variant: "default" }),
            "min-h-11 inline-flex items-center justify-center bg-[#1e40af] text-white hover:bg-[#1d4ed8] hover:text-white"
          )}
        >
          入力画面に戻る
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <ResultDisplay data={data} />
    </main>
  );
}
