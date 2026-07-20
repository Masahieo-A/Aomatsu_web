import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { getOpenAI, buildPrompt } from "@/lib/openai"
import {
  incrementGenerationCount,
  logGeneration,
} from "@/lib/usage"

export async function POST(request: NextRequest) {
  // 1. Session validation
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 })
  }

  const email = session.user.email
  const name = session.user.name ?? null

  // 2. Domain re-validation (double defense)
  const allowedDomain = process.env.ALLOWED_EMAIL_DOMAIN
  if (allowedDomain && !email.endsWith(`@${allowedDomain}`)) {
    return NextResponse.json(
      { error: "このアプリは本校の生徒のみ利用できます" },
      { status: 403 }
    )
  }

  // 3. Parse request body
  let userPrompt: string
  let style: string | undefined
  try {
    const body = await request.json()
    userPrompt = body.userPrompt
    style = typeof body.style === "string" && body.style.trim() ? body.style.trim() : undefined
    if (!userPrompt || typeof userPrompt !== "string" || userPrompt.trim() === "") {
      return NextResponse.json({ error: "プロンプトを入力してください" }, { status: 400 })
    }
  } catch {
    return NextResponse.json({ error: "リクエストの形式が正しくありません" }, { status: 400 })
  }

  // 4. Determine admin flag (kept for response metadata; no usage limit applies)
  const adminEmails = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
  const isAdmin = adminEmails.includes(email.toLowerCase())

  // 5. Build full prompt
  const fullPrompt = buildPrompt(userPrompt.trim(), style)

  // 6. Call OpenAI API
  let imageBase64: string
  try {
    const response = await getOpenAI().images.generate({
      model: "gpt-image-2",
      prompt: fullPrompt,
      size: "1536x1024",
      quality: "medium",
      n: 1,
    })

    const imageData = response.data?.[0]
    if (!imageData?.b64_json) {
      throw new Error("No image data in response")
    }
    imageBase64 = imageData.b64_json
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error"
    console.error("OpenAI API error:", errorMessage)

    await logGeneration({
      userEmail: email,
      userPrompt: userPrompt.trim(),
      status: "error",
      errorMessage,
    })

    return NextResponse.json(
      { error: "画像生成中にエラーが発生しました。もう一度お試しください。" },
      { status: 500 }
    )
  }

  // 7. Increment count and log (generation-first ordering; count is for stats only)
  let newCount = 0
  try {
    newCount = await incrementGenerationCount(email, name)
  } catch (err) {
    console.error("Failed to increment count:", err)
  }

  await logGeneration({
    userEmail: email,
    userPrompt: userPrompt.trim(),
    status: "success",
  })

  return NextResponse.json({
    imageDataUrl: `data:image/png;base64,${imageBase64}`,
    generationCount: newCount,
    isAdmin,
  })
}
