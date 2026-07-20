/** 項目一覧のCSVエクスポート（IO-04・研究発表/実践報告用）。 */
import { getItems } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function esc(v: unknown): string {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET() {
  const items = await getItems();
  const header = [
    "id",
    "name",
    "status",
    "level",
    "prerequisites",
    "positive_count",
    "negative_count",
    "accuracy",
    "runs",
    "updated_at",
  ];
  const rows = items.map((i) =>
    [
      i.id,
      i.name,
      i.status,
      i.level,
      i.prerequisites.join(" "),
      i.positive_examples.length,
      i.negative_examples.length,
      i.test_results.accuracy ?? "",
      i.test_results.runs,
      i.updated_at,
    ]
      .map(esc)
      .join(",")
  );
  const csv = "﻿" + [header.join(","), ...rows].join("\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="grammar_items.csv"',
    },
  });
}
