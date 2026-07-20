"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ChatMessage } from "@/types";
import type { IntersectionSummaryPayload } from "@/lib/intersectionSummarySchema";
import { INTERSECTION_CLOSING_COMMENT } from "@/lib/intersectionSummarySchema";
import { INTERSECTION_STORAGE_KEY } from "@/lib/intersectionSession";

type Stored = {
  messages: ChatMessage[];
};

function clsx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

export default function IntersectionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<IntersectionSummaryPayload | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const raw = sessionStorage.getItem(INTERSECTION_STORAGE_KEY);
      if (!raw) {
        router.replace("/");
        return;
      }

      let payload: Stored;
      try {
        payload = JSON.parse(raw) as Stored;
      } catch {
        router.replace("/");
        return;
      }

      if (!payload.messages?.length) {
        router.replace("/");
        return;
      }

      try {
        const res = await fetch("/api/intersection-summary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: payload.messages })
        });
        const json = (await res.json()) as IntersectionSummaryPayload & { error?: string };
        if (!res.ok) {
          throw new Error(json.error ?? "request_failed");
        }
        if (!cancelled) {
          setData({
            xAxis: json.xAxis,
            yAxis: json.yAxis,
            exampleQuestions: json.exampleQuestions
          });
        }
      } catch {
        if (!cancelled) setError("まとめの取得に失敗しました。チャットに戻ってもう一度お試しください。");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [router]);

  function clearAndHome() {
    sessionStorage.removeItem(INTERSECTION_STORAGE_KEY);
    router.push("/");
  }

  if (loading) {
    return (
      <div className="flex min-h-[50dvh] flex-col items-center justify-center gap-3 text-[#6b645c]">
        <p className="text-sm">交差点のまとめを準備しています…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-red-700">{error}</p>
        <button
          type="button"
          onClick={clearAndHome}
          className="rounded-lg border border-[#e2ddd8] bg-white px-4 py-2 text-sm font-semibold text-[#1a1714] shadow-sm hover:bg-[#f8f7f4]"
        >
          トップに戻る
        </button>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-lg font-bold text-[#1a1714]">交差点のまとめ</h1>
        <p className="text-sm text-[#6b645c]">X軸・Y軸を整理し、問いのヒントを3つ示します。</p>
      </header>

      <section className="rounded-[10px] border border-amber-200 bg-amber-50/80 p-4 shadow-sm">
        <h2 className="text-sm font-extrabold tracking-wide text-amber-900">X軸（テーマの方向）</h2>
        <p className="mt-1 text-xs font-semibold text-amber-800/90">分野</p>
        <p className="text-[15px] font-bold text-[#1a1714]">{data.xAxis.genre}</p>
        <p className="mt-3 text-xs font-semibold text-amber-800/90">いま向き合っていること</p>
        <p className="mt-1 whitespace-pre-wrap text-[15px] leading-7 text-[#1a1714]">
          {data.xAxis.focusSummary}
        </p>
      </section>

      <section className="rounded-[10px] border border-sky-200 bg-sky-50/80 p-4 shadow-sm">
        <h2 className="text-sm font-extrabold tracking-wide text-sky-900">Y軸（副次的レンズ）</h2>
        <p className="mt-2 text-[15px] font-bold text-[#1a1714]">{data.yAxis.lens}</p>
      </section>

      <section className="rounded-[10px] border border-[#52b788] bg-[#d8f3dc]/60 p-4 shadow-sm">
        <h2 className="text-sm font-extrabold tracking-wide text-[#1f5238]">交差点の問い（例・3つ）</h2>
        <ol className="mt-3 list-decimal space-y-3 pl-5 text-[15px] leading-7 text-[#1a1714]">
          {data.exampleQuestions.map((q, i) => (
            <li key={i} className="whitespace-pre-wrap pl-1">
              {q}
            </li>
          ))}
        </ol>
      </section>

      <section
        className={clsx(
          "rounded-[10px] border border-[#e2ddd8] bg-white p-4 text-[15px] leading-7 text-[#1a1714] shadow-sm"
        )}
      >
        {INTERSECTION_CLOSING_COMMENT}
      </section>

      <div className="flex flex-wrap gap-2 pb-6">
        <button
          type="button"
          onClick={clearAndHome}
          className="rounded-lg border border-[#e2ddd8] bg-white px-4 py-2 text-sm font-semibold text-[#1a1714] shadow-sm hover:bg-[#f8f7f4]"
        >
          トップに戻る
        </button>
        <Link
          href="/"
          onClick={() => sessionStorage.removeItem(INTERSECTION_STORAGE_KEY)}
          className="rounded-lg border border-[#52b788] bg-[#d8f3dc] px-4 py-2 text-sm font-semibold text-[#1f5238] shadow-sm hover:bg-[#d8f3dc]"
        >
          チャットを続ける
        </Link>
      </div>
    </div>
  );
}
