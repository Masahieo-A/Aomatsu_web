/**
 * STEP4 原因特定の確定: 安定誤りからError項目を確定し、
 * 前提グラフを遡って足場（scaffold）を求め、weakness_history を更新する。
 */
import { NextResponse } from "next/server";
import { detectStableErrors, scaffoldPath } from "@/lib/diagnosis";
import { getItems } from "@/lib/master";
import { getRepository, safeWrite } from "@/lib/repository";
import type { ItemOutcome } from "@/lib/diagnosis";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { session_id, learnerId, outcomes } = (await req.json()) as {
    session_id: string;
    learnerId?: string;
    outcomes: ItemOutcome[];
  };

  const { errorItems, zpdItems } = detectStableErrors(outcomes ?? []);
  const items = await getItems();
  const byId = new Map(items.map((i) => [i.id, i]));
  const masteredIds = new Set(
    (outcomes ?? [])
      .filter((o) => o.quadrant === "mastered")
      .map((o) => o.item_id)
  );

  const primary = errorItems[0] ?? zpdItems[0] ?? null;
  const scaffold = primary
    ? scaffoldPath(primary, byId, masteredIds)
    : [];

  const rootCause = primary
    ? `grammar:${primary}`
    : outcomes && outcomes.length > 0
    ? "mistake"
    : "vocab";

  const repo = getRepository();
  // Error項目を weakness_history に反映
  for (const id of errorItems) {
    await safeWrite(() =>
      repo.upsertWeakness({
        learner_id: learnerId || "anonymous",
        item_id: id,
        status: "error",
        error_count: 1,
        last_seen: new Date().toISOString(),
      })
    );
  }

  const primaryItem = primary ? byId.get(primary) : null;

  return NextResponse.json({
    root_cause: rootCause,
    error_items: errorItems,
    zpd_items: zpdItems,
    primary_item: primaryItem
      ? { id: primaryItem.id, name: primaryItem.name, level: primaryItem.level }
      : null,
    scaffold: scaffold.map((id) => ({
      id,
      name: byId.get(id)?.name ?? id,
    })),
  });
}
