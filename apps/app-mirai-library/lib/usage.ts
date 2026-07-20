import { getSupabase } from "@/lib/supabase"

export async function incrementGenerationCount(
  email: string,
  name: string | null
): Promise<number> {
  const db = getSupabase()
  const { data: existing } = await db
    .from("users")
    .select("generation_count")
    .eq("email", email)
    .single()

  if (!existing) {
    const { data, error } = await db
      .from("users")
      .insert({ email, name, generation_count: 1 })
      .select("generation_count")
      .single()

    if (error) throw new Error(`Failed to create user: ${error.message}`)
    return data.generation_count
  }

  const { data, error } = await db
    .from("users")
    .update({
      generation_count: existing.generation_count + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("email", email)
    .select("generation_count")
    .single()

  if (error) throw new Error(`Failed to update generation count: ${error.message}`)
  return data.generation_count
}

export async function logGeneration(params: {
  userEmail: string
  userPrompt: string
  imageUrl?: string
  status: "success" | "error"
  errorMessage?: string
}): Promise<void> {
  const db = getSupabase()
  const { error } = await db.from("generations").insert({
    user_email: params.userEmail,
    user_prompt: params.userPrompt,
    image_url: params.imageUrl ?? null,
    status: params.status,
    error_message: params.errorMessage ?? null,
  })

  if (error) {
    console.error("Failed to log generation:", error.message)
  }
}
