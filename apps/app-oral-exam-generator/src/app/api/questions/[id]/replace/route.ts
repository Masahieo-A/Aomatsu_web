import { NextResponse } from "next/server";
import { getStorage } from "@/lib/storage/adapter";
import { MECHANISM_OF } from "@/lib/pipeline/select";

export const dynamic = "force-dynamic";

/**
 * 差し替え（要件定義 §8 画面3）：選抜中の問いを、不合格でない次点候補と交換する。
 * 次点は「Gate1合格・status=candidate・他の選抜問とアンカーが重複しない」から
 * 同型 → 同メカニズム → その他 の優先順で選ぶ。
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const storage = await getStorage();
  const [target] = await storage.list("questions", { question_id: id });
  if (!target) {
    return NextResponse.json({ error: "問いが見つかりません" }, { status: 404 });
  }
  if (target.status !== "selected") {
    return NextResponse.json(
      { error: "選抜中の問いのみ差し替えできます" },
      { status: 400 }
    );
  }

  const all = await storage.list("questions", {
    submission_id: target.submission_id,
  });
  const otherSelected = all.filter(
    (q) => q.status === "selected" && q.question_id !== id
  );
  const stock = all.filter(
    (q) =>
      q.status === "candidate" &&
      q.gate1?.pass === true &&
      !otherSelected.some(
        (s) =>
          s.anchor.quoted_span === q.anchor.quoted_span ||
          (s.anchor.sentence_index === q.anchor.sentence_index && s.type === q.type)
      )
  );

  const replacement =
    stock.find((q) => q.type === target.type) ??
    stock.find((q) => MECHANISM_OF[q.type] === MECHANISM_OF[target.type]) ??
    stock[0];

  if (!replacement) {
    return NextResponse.json(
      {
        error:
          "差し替え可能な次点候補がありません。再生成するか、候補一覧から手動昇格してください。",
      },
      { status: 409 }
    );
  }

  await storage.update("questions", "question_id", target.question_id, {
    status: "replaced",
  });
  await storage.update("questions", "question_id", replacement.question_id, {
    status: "selected",
  });
  const [updated] = await storage.list("questions", {
    question_id: replacement.question_id,
  });
  return NextResponse.json({ question: updated });
}
