import { NextResponse } from "next/server";
import { z } from "zod";
import { getStorage } from "@/lib/storage/adapter";
import type { Question } from "@/types";

export const dynamic = "force-dynamic";

const PatchSchema = z.object({
  question_text: z.string().min(1).optional(),
  model_answer: z.string().min(1).optional(),
  acceptable_conditions: z.string().optional(),
  typical_wrong: z.string().optional(),
  scoring_steps: z.string().optional(),
  // 手動昇格（候補→selected）などステータス操作
  status: z.enum(["candidate", "rejected", "selected", "replaced", "approved"]).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "編集内容が不正です", detail: parsed.error.issues },
      { status: 400 }
    );
  }

  const storage = await getStorage();
  const [question] = await storage.list("questions", { question_id: id });
  if (!question) {
    return NextResponse.json({ error: "問いが見つかりません" }, { status: 404 });
  }

  const { status, ...contentFields } = parsed.data;
  const patch: Partial<Question> = { ...parsed.data };
  // 内容の変更は編集フラグを記録（教員修正率KPIの元データ。要件定義 §8 画面3）
  if (Object.keys(contentFields).length > 0) {
    patch.edited = true;
  }
  void status;

  await storage.update("questions", "question_id", id, patch);
  const [updated] = await storage.list("questions", { question_id: id });
  return NextResponse.json({ question: updated });
}
