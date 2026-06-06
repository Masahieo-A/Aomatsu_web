/**
 * 入力画面 — Pattern B（シングルコラム集中型）
 * テーマ・語数条件・英作文を入力し /api/evaluate へ POST する。
 */
"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Dictionary } from "@/components/Dictionary";
import { InputSchema } from "@/lib/schema";
import { saveEvaluationToSession, type EvaluationPayload } from "@/lib/store";
import { checkWordCountGuard, countWords } from "@/lib/validation";

type FieldErrors = Partial<Record<"topic" | "wordCountReq" | "essay", string>>;

const TOPIC_PLACEHOLDER =
  "Some people practice foreign languages with AI. Do you think this is a good idea?";

/* ===== ステップバー ===== */
function StepBar({ active }: { active: "input" | "result" }) {
  const steps = [
    { key: "input", label: "① 入力" },
    { key: "result", label: "② 結果" },
  ] as const;

  return (
    <div className="border-b border-[#e2ddd8] bg-white px-5 py-3">
      <div className="mx-auto flex max-w-[820px] items-center gap-3">
        {steps.map((s, i) => (
          <div key={s.key} className="flex items-center gap-3">
            {i > 0 && <div className="h-px w-12 bg-[#e2ddd8]" />}
            <div className="flex items-center gap-2">
              <span
                className={[
                  "flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold",
                  s.key === active
                    ? "bg-[#2d6a4f] text-white"
                    : active === "result" && s.key === "input"
                      ? "bg-[#d8f3dc] text-[#2d6a4f]"
                      : "bg-[#e2ddd8] text-[#6b645c]",
                ].join(" ")}
              >
                {active === "result" && s.key === "input" ? "✓" : i + 1}
              </span>
              <span
                className={[
                  "text-sm font-semibold",
                  s.key === active ? "text-[#2d6a4f]" : "text-[#6b645c]",
                ].join(" ")}
              >
                {s.label}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ===== セクションカードのヘッダー ===== */
function SectionHeader({
  icon,
  title,
  sub,
}: {
  icon: string;
  title: string;
  sub?: string;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-[#e2ddd8] px-4 py-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-[#d8f3dc] text-base">
        {icon}
      </span>
      <div>
        <p className="text-sm font-bold text-[#1a1714]">{title}</p>
        {sub && <p className="text-xs text-[#6b645c]">{sub}</p>}
      </div>
    </div>
  );
}

/* ===== フィールドエラー ===== */
function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <p className="mt-1 whitespace-pre-line text-sm text-[#c0392b]" role="alert">
      {msg}
    </p>
  );
}

/* ===== メインコンポーネント ===== */
export function EssayForm() {
  const router = useRouter();
  const [topic, setTopic] = useState("");
  const [wordCountReq, setWordCountReq] = useState("");
  const [essay, setEssay] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);

  const wordCount = useMemo(() => countWords(essay), [essay]);

  const runSubmit = async () => {
    setErrors({});
    const body = {
      topic: topic.trim(),
      wordCountReq: wordCountReq.trim(),
      essay: essay.trim(),
    };
    const z = InputSchema.safeParse(body);
    if (!z.success) {
      const next: FieldErrors = {};
      for (const iss of z.error.issues) {
        const p = iss.path[0];
        if (p === "topic" || p === "wordCountReq" || p === "essay") {
          if (!next[p]) next[p] = iss.message;
        }
      }
      setErrors(next);
      return;
    }

    const guard = checkWordCountGuard(z.data.essay, z.data.wordCountReq);
    if (guard) {
      setErrors({ essay: guard });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(z.data),
      });
      const data: unknown = await res.json().catch(() => ({}));
      const errBody =
        typeof data === "object" && data !== null
          ? (data as { error?: unknown; code?: unknown })
          : {};
      const errMsg = typeof errBody.error === "string" ? errBody.error : null;
      const errCode = typeof errBody.code === "string" ? errBody.code : null;

      if (!res.ok) {
        if (res.status === 503) {
          toast.error("サーバーが混み合っています。少し待ってください");
          return;
        }
        if (res.status === 400) {
          const msg = errMsg ?? "入力内容を確認してください";
          if (msg.includes("短すぎ")) {
            setErrors({ essay: msg });
          } else {
            toast.error(msg);
          }
          return;
        }
        if (errCode === "CONFIG" && errMsg) {
          toast.error(errMsg, { duration: 20_000 });
          return;
        }
        if (errCode === "GEMINI_AUTH" && errMsg) {
          toast.error(errMsg, { duration: 15_000 });
          return;
        }
        if (errCode === "PARSE" && errMsg) {
          toast.error(errMsg, { duration: 12_000 });
          return;
        }
        toast.error(
          errMsg ?? "添削処理中にエラーが発生しました。しばらくしてからもう一度お試しください。"
        );
        return;
      }

      if (
        typeof data !== "object" ||
        data === null ||
        !("wordCount" in data) ||
        !("positiveComment" in data) ||
        !("errors" in data)
      ) {
        toast.error("添削結果の取得に失敗しました");
        return;
      }

      const payload: EvaluationPayload = {
        topic: z.data.topic,
        wordCountReq: z.data.wordCountReq,
        essay: z.data.essay,
        result: data as EvaluationPayload["result"],
      };
      saveEvaluationToSession(payload);
      router.push("/result");
    } catch {
      toast.error("通信エラー。もう一度お試しください");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <StepBar active="input" />

      {/* コンテンツ */}
      <div className="mx-auto max-w-[820px] space-y-4 px-4 py-6 pb-28 sm:px-6">

        {/* アプリ説明 */}
        <div className="rounded-[10px] border border-[#d8f3dc] bg-[#d8f3dc]/40 px-4 py-3 text-sm leading-relaxed text-[#1a1714]">
          <span className="mr-1 font-bold text-[#2d6a4f]">このアプリについて：</span>
          英作文を文法の観点からヒント形式でフィードバックします。AIは英文を書き直しません。ヒントをもとに、自分で修正しましょう。
        </div>

        {/* テーマ入力 */}
        <div className="overflow-hidden rounded-[10px] border border-[#e2ddd8] bg-white">
          <SectionHeader icon="📋" title="テーマ" sub="英作文のお題を入力してください（500字以内）" />
          <div className="p-4">
            <textarea
              className="w-full rounded-[8px] border border-[#e2ddd8] bg-[#f8f7f4] p-3 text-sm leading-relaxed text-[#1a1714] outline-none transition focus:border-[#52b788] disabled:opacity-50"
              rows={3}
              placeholder={TOPIC_PLACEHOLDER}
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              disabled={loading}
              aria-invalid={!!errors.topic}
            />
            <FieldError msg={errors.topic} />
          </div>
        </div>

        {/* 必要語数 */}
        <div className="overflow-hidden rounded-[10px] border border-[#e2ddd8] bg-white">
          <SectionHeader icon="🔢" title="必要語数" sub="単一数字（例：80）= 最低語数　範囲（例：80-100）= その範囲内" />
          <div className="p-4">
            <input
              type="text"
              className="w-full rounded-[8px] border border-[#e2ddd8] bg-[#f8f7f4] px-3 py-2 text-sm text-[#1a1714] outline-none transition focus:border-[#52b788] disabled:opacity-50 sm:w-64"
              placeholder="80  または  80-100"
              value={wordCountReq}
              onChange={(e) => setWordCountReq(e.target.value)}
              disabled={loading}
              autoComplete="off"
              aria-invalid={!!errors.wordCountReq}
            />
            <FieldError msg={errors.wordCountReq} />
          </div>
        </div>

        {/* エッセイ入力 */}
        <div className="overflow-hidden rounded-[10px] border border-[#e2ddd8] bg-white">
          <SectionHeader icon="✍️" title="英作文を書く" sub="フィードバック後、自分で修正してみましょう" />
          <div className="p-4">
            <textarea
              className="w-full rounded-[8px] border border-[#e2ddd8] bg-white p-3 font-mono text-[15px] leading-[1.9] text-[#1a1714] outline-none transition focus:border-[#52b788] disabled:opacity-50"
              rows={14}
              placeholder="Write your essay here..."
              value={essay}
              onChange={(e) => setEssay(e.target.value)}
              disabled={loading}
              aria-invalid={!!errors.essay}
            />
            <p
              className="mt-1 text-sm text-[#6b645c]"
              aria-live="polite"
            >
              語数：
              <span className="font-bold text-[#1a1714]">{wordCount}</span>{" "}
              words
            </p>
            <FieldError msg={errors.essay} />
          </div>
        </div>

        {/* 辞書 */}
        <Dictionary />

      </div>

      {/* ===== 固定ボトムバー ===== */}
      <div className="fixed bottom-0 left-0 right-0 z-40 flex items-center gap-4 border-t border-[#e2ddd8] bg-white px-5 py-3">
        <span className="text-sm text-[#6b645c]">
          語数：<span className="font-bold text-[#1a1714]">{wordCount}</span> words
        </span>
        <div className="flex-1" />
        <button
          type="button"
          onClick={runSubmit}
          disabled={loading}
          aria-busy={loading}
          className="rounded-[8px] bg-[#2d6a4f] px-6 py-2.5 text-sm font-bold text-white transition hover:bg-[#1f5238] disabled:opacity-60"
        >
          {loading ? "添削中…" : "AIフィードバックを取得 →"}
        </button>
      </div>
    </>
  );
}
