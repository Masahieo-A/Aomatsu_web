// CSV 生成。サーバー専用（クライアントから import しない）。
// Excel で開いて数式として実行されないよう、= + - @ などで始まるセルの先頭に ' を付ける。
import type { CardRow, StanceRow } from "./db";

function cell(v: string | number | null): string {
  let s = v === null ? "" : String(v);
  if (typeof v === "string" && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

function toCsv(header: string[], rows: (string | number | null)[][]): string {
  const lines = [header.map(cell).join(","), ...rows.map((r) => r.map(cell).join(","))];
  // UTF-8 BOM を付け、Excel でも文字化けしないようにする
  return "﻿" + lines.join("\r\n") + "\r\n";
}

export function cardsCsv(cards: CardRow[]): string {
  return toCsv(
    ["class", "number", "article_id", "side", "point", "source_sentence", "fact", "number_example", "so_what", "weak_point", "created_at", "updated_at"],
    cards.map((c) => [
      c.classId, c.number, c.articleId, c.side, c.point, c.sourceSentence, c.fact, c.numberExample, c.soWhat, c.weakPoint, c.createdAt, c.updatedAt,
    ]),
  );
}

export function studentsCsv(students: StanceRow[]): string {
  return toCsv(
    ["class", "number", "stance_before", "stance_after", "stance_reason", "updated_at"],
    students.map((s) => [s.classId, s.number, s.stanceBefore, s.stanceAfter, s.stanceReason, s.updatedAt]),
  );
}
