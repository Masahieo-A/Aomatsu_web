import { NextResponse } from "next/server";
import { z } from "zod";
import { getStorage } from "@/lib/storage/adapter";
import type { Result } from "@/types";

export const dynamic = "force-dynamic";

/** 課題配下の採点結果を提出・問いと合わせて返す */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const assignment_id = searchParams.get("assignment_id");
  if (!assignment_id) {
    return NextResponse.json(
      { error: "assignment_id を指定してください" },
      { status: 400 }
    );
  }
  const storage = await getStorage();
  const submissions = (
    await storage.list("submissions", { assignment_id })
  ).filter((s) => s.status === "approved");

  const questions = [];
  for (const s of submissions) {
    const qs = await storage.list("questions", {
      submission_id: s.submission_id,
    });
    questions.push(...qs.filter((q) => q.status === "approved"));
  }

  const allResults = await storage.list("results");
  const questionIds = new Set(questions.map((q) => q.question_id));
  const results = allResults.filter((r) => questionIds.has(r.question_id));

  return NextResponse.json({ submissions, questions, results });
}

const PostSchema = z.object({
  question_id: z.string().min(1),
  student_label: z.string().min(1),
  score: z.union([z.literal(0), z.literal(1)]),
});

/** 採点結果の登録（同じ問いへの再入力は上書き） */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = PostSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "採点内容が不正です", detail: parsed.error.issues },
      { status: 400 }
    );
  }
  const storage = await getStorage();
  const [question] = await storage.list("questions", {
    question_id: parsed.data.question_id,
  });
  if (!question) {
    return NextResponse.json({ error: "問いが見つかりません" }, { status: 404 });
  }

  const result: Result = {
    question_id: parsed.data.question_id,
    student_label: parsed.data.student_label,
    score: parsed.data.score,
    scored_at: new Date().toISOString(),
  };

  const existing = await storage.list("results", {
    question_id: parsed.data.question_id,
  });
  if (existing.length > 0) {
    await storage.update("results", "question_id", result.question_id, result);
  } else {
    await storage.insert("results", [result]);
  }
  return NextResponse.json({ result }, { status: 201 });
}
