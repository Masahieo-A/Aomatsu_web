import raw from "@/data/source-links.json";

type SourceLinkEntry = { url: string; note: string };

const sourceLinks = raw as Record<string, SourceLinkEntry>;

/**
 * 要項PDFの実体は自前でホスト・再配布しない（要件定義§9）。
 * 各大学が公開している取得元URL（manifest.csv）にリンクすることで
 * 「1クリックで一次資料に到達できること」を満たす。
 */
export function resolvePdfLink(pdfFile: string, page: number): { href: string; isDirectPdf: boolean } | null {
  const entry = sourceLinks[pdfFile];
  if (!entry) return null;
  const isDirectPdf = entry.url.toLowerCase().endsWith(".pdf");
  return {
    href: isDirectPdf ? `${entry.url}#page=${page}` : entry.url,
    isDirectPdf,
  };
}
