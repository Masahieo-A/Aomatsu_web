import { NextResponse } from "next/server";
import { getStorage } from "@/lib/storage/adapter";

export const dynamic = "force-dynamic";

export async function GET(
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
  return NextResponse.json({ submission, questions });
}
