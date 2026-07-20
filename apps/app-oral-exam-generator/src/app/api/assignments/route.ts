import { NextResponse } from "next/server";
import { getStorage } from "@/lib/storage/adapter";
import { AssignmentCreateSchema, type Assignment } from "@/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const storage = await getStorage();
  const assignments = await storage.list("assignments");
  assignments.sort((a, b) => b.created_at.localeCompare(a.created_at));
  return NextResponse.json({ assignments });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = AssignmentCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "課題の入力内容が不正です", detail: parsed.error.issues },
      { status: 400 }
    );
  }

  const assignment: Assignment = {
    assignment_id: `a_${Date.now()}`,
    title: parsed.data.title,
    mode: parsed.data.mode,
    question_count: parsed.data.question_count,
    created_at: new Date().toISOString(),
  };

  const storage = await getStorage();
  await storage.insert("assignments", [assignment]);
  return NextResponse.json({ assignment }, { status: 201 });
}
