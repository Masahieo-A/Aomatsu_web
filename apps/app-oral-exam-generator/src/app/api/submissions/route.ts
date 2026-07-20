import { NextResponse } from "next/server";
import { z } from "zod";
import { getStorage } from "@/lib/storage/adapter";
import { parseCsv } from "@/lib/csv";
import type { Submission } from "@/types";

export const dynamic = "force-dynamic";

const SingleSchema = z.object({
  assignment_id: z.string().min(1),
  student_label: z.string().trim().min(1),
  text: z.string().trim().min(1),
});

const CsvSchema = z.object({
  assignment_id: z.string().min(1),
  csv: z.string().trim().min(1),
});

function newSubmission(
  assignment_id: string,
  student_label: string,
  text: string
): Submission {
  return {
    submission_id: `s_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`,
    assignment_id,
    student_label,
    text,
    status: "submitted",
    analysis: null,
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const assignment_id = searchParams.get("assignment_id");
  const storage = await getStorage();
  const submissions = await storage.list(
    "submissions",
    assignment_id ? { assignment_id } : undefined
  );
  return NextResponse.json({ submissions });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const storage = await getStorage();

  // 課題の存在チェック（単発・CSV共通）
  const assignmentId =
    body && typeof body.assignment_id === "string" ? body.assignment_id : "";
  const assignments = await storage.list("assignments", {
    assignment_id: assignmentId,
  });
  if (assignments.length === 0) {
    return NextResponse.json(
      { error: "指定された課題が存在しません" },
      { status: 400 }
    );
  }

  // CSV一括インポート（student_label,text の2列）
  if (body && typeof body.csv === "string") {
    const parsed = CsvSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "CSVの入力内容が不正です", detail: parsed.error.issues },
        { status: 400 }
      );
    }
    let rows = parseCsv(parsed.data.csv);
    // ヘッダー行（student_label,text）があればスキップ
    if (
      rows.length > 0 &&
      rows[0][0]?.trim().toLowerCase() === "student_label"
    ) {
      rows = rows.slice(1);
    }
    const errors: string[] = [];
    const submissions: Submission[] = [];
    rows.forEach((row, i) => {
      const [label, text] = [row[0]?.trim() ?? "", row[1]?.trim() ?? ""];
      if (!label || !text) {
        errors.push(`${i + 1}行目: student_label または text が空です`);
        return;
      }
      submissions.push(newSubmission(parsed.data.assignment_id, label, text));
    });
    if (submissions.length === 0) {
      return NextResponse.json(
        { error: "取り込める行がありませんでした", detail: errors },
        { status: 400 }
      );
    }
    await storage.insert("submissions", submissions);
    return NextResponse.json(
      { inserted: submissions.length, errors },
      { status: 201 }
    );
  }

  // 単発投入
  const parsed = SingleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "提出の入力内容が不正です", detail: parsed.error.issues },
      { status: 400 }
    );
  }
  const submission = newSubmission(
    parsed.data.assignment_id,
    parsed.data.student_label,
    parsed.data.text
  );
  await storage.insert("submissions", [submission]);
  return NextResponse.json({ submission }, { status: 201 });
}
