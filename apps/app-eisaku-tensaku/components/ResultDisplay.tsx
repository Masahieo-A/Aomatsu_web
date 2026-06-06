/**
 * 結果画面 — Pattern B（シングルコラム集中型）
 * 添削結果・語数チェック・ヒントカード群・辞書を表示する。
 */
import Link from "next/link";
import { Dictionary } from "@/components/Dictionary";
import { ErrorCard } from "@/components/ErrorCard";
import type { EvaluationPayload } from "@/lib/store";

type Props = { data: EvaluationPayload };

/* ===== ステップバー（再利用のため直接定義） ===== */
function StepBar() {
  return (
    <div className="border-b border-[#e2ddd8] bg-white px-5 py-3">
      <div className="mx-auto flex max-w-[820px] items-center gap-3">
        {/* Step 1: 完了 */}
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#d8f3dc] text-xs font-bold text-[#2d6a4f]">
            ✓
          </span>
          <span className="text-sm font-semibold text-[#6b645c]">① 入力</span>
        </div>
        <div className="h-px w-12 bg-[#e2ddd8]" />
        {/* Step 2: アクティブ */}
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#2d6a4f] text-xs font-bold text-white">
            2
          </span>
          <span className="text-sm font-semibold text-[#2d6a4f]">② 結果</span>
        </div>
      </div>
    </div>
  );
}

/* ===== セクションヘッダー ===== */
function SectionHeader({
  icon,
  title,
  sub,
  highlight = false,
}: {
  icon: string;
  title: string;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={[
        "flex items-center gap-3 border-b border-[#e2ddd8] px-4 py-3",
        highlight ? "bg-[#d8f3dc]/50" : "",
      ].join(" ")}
    >
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

/* ===== メインコンポーネント ===== */
export function ResultDisplay({ data }: Props) {
  const { topic, wordCountReq, essay, result } = data;
  const { satisfied, count } = result.wordCount;
  const errorCount = result.errors.length;

  return (
    <>
      <StepBar />

      <div className="mx-auto max-w-[820px] space-y-4 px-4 py-6 pb-24 sm:px-6">

        {/* ① 提出した内容（折りたたみなしで表示） */}
        <details className="group overflow-hidden rounded-[10px] border border-[#e2ddd8] bg-white" open>
          <summary className="flex cursor-pointer list-none items-center gap-3 border-b border-[#e2ddd8] px-4 py-3 hover:bg-[#f8f7f4]">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-[#d8f3dc] text-base">
              📄
            </span>
            <div className="flex-1">
              <p className="text-sm font-bold text-[#1a1714]">提出した英作文</p>
              <p className="text-xs text-[#6b645c]">テーマと英文を確認する</p>
            </div>
            <span className="text-xs text-[#6b645c] group-open:hidden">▼ 開く</span>
            <span className="hidden text-xs text-[#6b645c] group-open:inline">▲ 閉じる</span>
          </summary>
          <div className="p-4 space-y-3">
            <div>
              <p className="mb-1 text-xs font-bold uppercase tracking-widest text-[#6b645c]">テーマ</p>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#1a1714]">{topic}</p>
            </div>
            <div>
              <p className="mb-1 text-xs font-bold uppercase tracking-widest text-[#6b645c]">英作文</p>
              <p className="whitespace-pre-wrap rounded-[8px] border border-[#e2ddd8] bg-[#f8f7f4] p-3 font-mono text-sm leading-[1.9] text-[#1a1714]">
                {essay}
              </p>
            </div>
          </div>
        </details>

        {/* ② 語数チェック + 良い点 */}
        <div className="overflow-hidden rounded-[10px] border border-[#e2ddd8] bg-white">
          <SectionHeader icon="📊" title="結果サマリー" highlight />
          <div className="p-4 space-y-3">
            {/* 語数 */}
            <div className="flex items-center gap-3 rounded-[8px] border border-[#e2ddd8] bg-[#f8f7f4] px-4 py-2.5">
              <span className="text-sm text-[#6b645c]">語数の条件：</span>
              <span
                className={[
                  "font-bold",
                  satisfied ? "text-[#2d6a4f]" : "text-[#c0392b]",
                ].join(" ")}
              >
                {satisfied ? "✓ 満たしている" : "✗ 満たしていない"}
              </span>
              <span className="text-sm text-[#6b645c]">
                （{count} 語 / 条件: {wordCountReq}）
              </span>
            </div>

            {/* 修正候補件数 */}
            <div className="flex items-center gap-2 text-sm">
              <span className="text-[#6b645c]">文法の修正候補：</span>
              <span className="font-bold text-[#1a1714]">{errorCount} 件</span>
            </div>

            {/* 良い点 */}
            <div className="rounded-[8px] border border-[#d8f3dc] bg-[#d8f3dc]/40 px-4 py-3">
              <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-[#2d6a4f]">
                💚 良い点
              </p>
              <p className="text-sm leading-relaxed text-[#1a1714]">
                {result.positiveComment}
              </p>
            </div>

            {/* 注意書き */}
            <p className="text-xs leading-relaxed text-[#6b645c]">
              ※ このアプリは「文法の正しさ」のみを評価しています。内容・構成については評価対象外です。トピックへの回答内容は自分で確認してください。
            </p>
          </div>
        </div>

        {/* ③ エラーカード群 */}
        {errorCount > 0 && (
          <div className="space-y-3">
            <p className="px-1 text-[11px] font-bold uppercase tracking-widest text-[#6b645c]">
              ヒント一覧 — 自分で修正してみましょう
            </p>
            {result.errors.map((err, i) => (
              <ErrorCard
                key={`${err.sentence.slice(0, 40)}-${i}`}
                item={err}
                index={i}
              />
            ))}
          </div>
        )}

        {errorCount === 0 && (
          <div className="rounded-[10px] border border-[#d8f3dc] bg-[#d8f3dc]/40 px-5 py-4 text-center text-sm text-[#2d6a4f]">
            🎉 文法エラーは見つかりませんでした。素晴らしいです！
          </div>
        )}

        {/* ④ 辞書 */}
        <Dictionary defaultOpen={false} />

        {/* ⑤ もう一度 */}
        <div className="pt-2">
          <Link
            href="/"
            className="inline-flex items-center rounded-[8px] border border-[#e2ddd8] bg-white px-5 py-2.5 text-sm font-semibold text-[#6b645c] transition hover:border-[#52b788] hover:text-[#2d6a4f]"
          >
            ← もう一度添削する
          </Link>
        </div>

      </div>
    </>
  );
}
