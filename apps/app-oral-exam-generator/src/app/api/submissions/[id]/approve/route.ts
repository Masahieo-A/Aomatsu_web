import { NextResponse } from "next/server";
import { getStorage } from "@/lib/storage/adapter";

export const dynamic = "force-dynamic";

/** 全問承認：選抜中の問いを approved にし、提出の status を approved にする */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const storage = await getStorage();
  const [submission] = await storage.list("submissions", {
    submission_id: id,
  });
  if (!submission) {
    return NextResponse.json({ error: "提出が見つかりません" }, { status: 404 });
  }
  const questions = await storage.list("questions", { submission_id: id });
  const selected = questions.filter((q) => q.status === "selected");
  if (selected.length === 0) {
    return NextResponse.json(
      { error: "選抜中の問いがありません" },
      { status: 400 }
    );
  }
  for (const q of selected) {
    await storage.update("questions", "question_id", q.question_id, {
      status: "approved",
    });
  }
  await storage.update("submissions", "submission_id", id, {
    status: "approved",
  });
  return NextResponse.json({ approved: selected.length });
}
