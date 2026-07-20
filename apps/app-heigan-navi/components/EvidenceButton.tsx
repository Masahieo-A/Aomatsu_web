"use client";

import { Evidence } from "@/lib/types";
import { resolvePdfLink } from "@/lib/sourceLinks";

/**
 * 根拠ボタン：原文引用をポップオーバー表示＋「PDFで確認」リンク（§F1）。
 * PDF本体は自前でホスト・再配布せず、各大学の公開元URL（manifest.csv）にリンクする。
 */
export default function EvidenceButton({ evidence }: { evidence: Evidence[] }) {
  if (evidence.length === 0) return null;
  return (
    <details className="group relative inline-block print:hidden">
      <summary className="cursor-pointer list-none rounded border border-zinc-300 px-1.5 py-0.5 text-[11px] text-zinc-500 hover:bg-zinc-100">
        根拠
      </summary>
      <div className="absolute z-30 mt-1 w-72 rounded-md border border-zinc-300 bg-white p-3 shadow-lg">
        {evidence.map((e, i) => {
          const link = resolvePdfLink(e.pdfFile, e.page);
          return (
            <div key={i} className={i > 0 ? "mt-2 border-t border-zinc-200 pt-2" : ""}>
              <p className="text-xs text-zinc-500">{e.field}</p>
              <p className="mt-0.5 text-sm leading-snug">「{e.quote}」</p>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-[11px] text-zinc-400">
                  {e.pdfFile.split("/").pop()} p.{e.page}
                  {!e.verified && "（未検証）"}
                </span>
                {link ? (
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] font-medium text-blue-600 hover:underline"
                  >
                    {link.isDirectPdf ? "PDFで確認 →" : "大学サイトで確認 →"}
                  </a>
                ) : (
                  <span className="text-[11px] text-zinc-300">リンク未登録</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </details>
  );
}
