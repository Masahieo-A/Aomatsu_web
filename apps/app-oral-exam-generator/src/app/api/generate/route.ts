import { NextResponse } from "next/server";
import { z } from "zod";
import {
  runPipeline,
  ESTIMATED_CALLS_PER_SUBMISSION,
  type PipelineReport,
} from "@/lib/pipeline/generate";
import {
  CALL_LIMIT_PER_RUN,
  getCallCount,
  resetCallCount,
} from "@/lib/llm/gemini";
import { getStorage } from "@/lib/storage/adapter";

export const dynamic = "force-dynamic";
// 一括実行はレート制限対応の直列キューのため長時間かかる
export const maxDuration = 3600;

const BodySchema = z.union([
  z.object({ submission_id: z.string().min(1) }),
  z.object({
    assignment_id: z.string().min(1),
    confirm: z.boolean().optional(),
  }),
]);

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "submission_id または assignment_id を指定してください" },
      { status: 400 }
    );
  }

  // --- 単発実行（JSON応答） -------------------------------------------------
  if ("submission_id" in parsed.data) {
    try {
      const report = await runPipeline(parsed.data.submission_id);
      return NextResponse.json({ report });
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : String(err) },
        { status: 500 }
      );
    }
  }

  // --- 一括実行（SSEストリーム） ---------------------------------------------
  const { assignment_id, confirm } = parsed.data;
  const storage = await getStorage();
  const submissions = (
    await storage.list("submissions", { assignment_id })
  ).filter((s) => s.status !== "approved");

  if (submissions.length === 0) {
    return NextResponse.json(
      { error: "処理対象の提出がありません（承認済みは対象外）" },
      { status: 400 }
    );
  }

  // コスト防御（§12）：上限超過見込みは実行前に警告
  const estimatedCalls = submissions.length * ESTIMATED_CALLS_PER_SUBMISSION;
  if (estimatedCalls > CALL_LIMIT_PER_RUN && !confirm) {
    return NextResponse.json(
      {
        warning: `推定API呼び出し数（約${estimatedCalls}回）が上限（${CALL_LIMIT_PER_RUN}回）を超えます。実行しますか？`,
        estimated_calls: estimatedCalls,
        limit: CALL_LIMIT_PER_RUN,
      },
      { status: 409 }
    );
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      };

      resetCallCount();
      const reports: PipelineReport[] = [];

      send("begin", {
        total: submissions.length,
        estimated_calls: estimatedCalls,
      });

      for (const submission of submissions) {
        // 実行中の上限到達もチェック（コスト防御）
        if (getCallCount() >= CALL_LIMIT_PER_RUN) {
          send("error", {
            submission_id: submission.submission_id,
            student_label: submission.student_label,
            message: `API呼び出し上限（${CALL_LIMIT_PER_RUN}回）に達したため以降をスキップしました`,
          });
          break;
        }
        try {
          const report = await runPipeline(
            submission.submission_id,
            (event) => send("progress", event)
          );
          reports.push(report);
          send("report", report);
        } catch (err) {
          // 途中失敗はスキップ記録して続行（§11 Phase 2 受け入れ条件）
          send("error", {
            submission_id: submission.submission_id,
            student_label: submission.student_label,
            message: err instanceof Error ? err.message : String(err),
          });
        }
      }

      const sum = (f: (r: PipelineReport) => number) =>
        reports.reduce((a, r) => a + f(r), 0);
      send("done", {
        total: submissions.length,
        completed: reports.length,
        ok_count: reports.filter((r) => r.ok).length,
        call_count: getCallCount(),
        candidate_count: sum((r) => r.candidate_count),
        gate1_pass_count: sum((r) => r.gate1_pass_count),
        gate2_pass_count: sum((r) => r.gate2_pass_count),
        gate3_pass_count: sum((r) => r.gate3_pass_count),
        selected_count: sum((r) => r.selected_count),
      });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
