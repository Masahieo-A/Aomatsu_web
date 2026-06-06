/**
 * POST /api/evaluate — 入力検証、語数極小ガード、Gemini 呼び出し、JSON 返却
 */
import { NextResponse } from "next/server";

import {
  evaluateEssayWithGemini,
  isGeminiApiError,
} from "@/lib/gemini";
import { InputSchema } from "@/lib/schema";
import { checkWordCountGuard } from "@/lib/validation";

const SERVER_ERROR_JA =
  "添削処理中にエラーが発生しました。しばらくしてからもう一度お試しください。";

const PARSE_ERROR_JA =
  "処理に失敗しました。文章を見直して再送信してください。";

/** Vercel 等で GEMINI_API_KEY が未設定のとき（.env.local は本番では使われない） */
const CONFIG_ERROR_JA =
  "Gemini API キーがサーバーに設定されていません。Vercel の「Settings → Environment Variables」に GEMINI_API_KEY を登録し、Production / Preview の両方に必要なら反映し、保存後に再デプロイしてください。";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "リクエストの形式が正しくありません" }, { status: 400 });
  }

  const parsed = InputSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json(
      { error: first?.message ?? "入力内容を確認してください" },
      { status: 400 }
    );
  }

  const { topic, wordCountReq, essay } = parsed.data;
  const guard = checkWordCountGuard(essay, wordCountReq);
  if (guard) {
    return NextResponse.json({ error: guard }, { status: 400 });
  }

  if (!process.env.GEMINI_API_KEY?.trim()) {
    console.error("[api/evaluate] GEMINI_API_KEY is missing");
    return NextResponse.json(
      { error: CONFIG_ERROR_JA, code: "CONFIG" as const },
      { status: 500 }
    );
  }

  try {
    const result = await evaluateEssayWithGemini(topic, wordCountReq, essay);
    return NextResponse.json(result, { status: 200 });
  } catch (e) {
    if (isGeminiApiError(e)) {
      if (e.status === 429 || (e.status >= 500 && e.status < 600)) {
        return NextResponse.json(
          { error: SERVER_ERROR_JA, code: "SERVER_BUSY" as const },
          { status: 503 }
        );
      }
      if (e.status === 401 || e.status === 403) {
        return NextResponse.json(
          {
            error:
              "API キーが無効か、Gemini API の利用が拒否されました。キー（Google AI Studio）と利用制限を確認してください。",
            code: "GEMINI_AUTH" as const,
          },
          { status: 500 }
        );
      }
    }

    const code =
      e instanceof Error ? e.message : "UNKNOWN";
    if (
      code === "GEMINI_JSON_PARSE" ||
      code === "GEMINI_OUTPUT_VALIDATION" ||
      code === "GEMINI_EMPTY_RESPONSE" ||
      code === "GEMINI_RESPONSE_BLOCKED"
    ) {
      return NextResponse.json({ error: PARSE_ERROR_JA, code: "PARSE" as const }, { status: 500 });
    }

    if (code === "GEMINI_API_KEY_NOT_SET") {
      return NextResponse.json(
        { error: CONFIG_ERROR_JA, code: "CONFIG" as const },
        { status: 500 }
      );
    }

    return NextResponse.json({ error: SERVER_ERROR_JA }, { status: 500 });
  }
}
