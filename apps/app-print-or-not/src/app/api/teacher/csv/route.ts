// CSV 出力（type=cards | students）。UTF-8 BOM 付き。
import { json } from "@/lib/server/api";
import { cardsCsv, studentsCsv } from "@/lib/server/csv";
import { handleTeacher } from "@/lib/server/teacher-auth";
import { parseOptionalClassId } from "@/lib/server/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<Response> {
  return handleTeacher(req, "api/teacher/csv", async ({ body, repo }) => {
    const classId = parseOptionalClassId(body.classId);
    if (!classId.ok) return json({ ok: false, error: classId.error }, 400);
    if (body.type !== "cards" && body.type !== "students") {
      return json({ ok: false, error: "CSV の種類が正しくありません" }, 400);
    }
    const text =
      body.type === "cards" ? cardsCsv(await repo.listCards(classId.value)) : studentsCsv(await repo.listStudents(classId.value));
    const name = `print-or-not_${body.type}_${classId.value ?? "all"}.csv`;
    return new Response(text, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${name}"`,
        "Cache-Control": "no-store",
      },
    });
  });
}
