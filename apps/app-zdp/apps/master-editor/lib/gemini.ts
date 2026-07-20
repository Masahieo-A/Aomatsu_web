/**
 * Gemini Flash クライアント（マスタアプリ用）。
 * ZDPアプリの P-01 と同一のプロンプト（@zdp/prompts）・同一パラメータを使う。
 * これによりテストベンチの判定＝本番の判定 の同一性を担保する（要件 §4）。
 * GEMINI_API_KEY 未設定時はモック。
 */
const MODEL = process.env.GEMINI_MODEL || "gemini-flash-latest";
const API_KEY = process.env.GEMINI_API_KEY;

export const isMockMode = () => !API_KEY;

export interface P01Result {
  item_id: string;
  contains: boolean;
  evidence: string;
}

async function callOnce(
  prompt: string,
  temperature: number
): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature,
          responseMimeType: "application/json",
        },
      }),
    }
  );
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

function parse(text: string): P01Result {
  const cleaned = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  return JSON.parse(cleaned) as P01Result;
}

/** モック: expected（陽性=true/陰性=false）を約90%再現し、10%を決定的に反転させる。 */
function mock(itemId: string, expected: boolean, seedText: string): P01Result {
  let h = 0;
  for (const ch of seedText) h = (h * 31 + ch.charCodeAt(0)) % 1000;
  const flip = h < 100; // 10%
  const contains = flip ? !expected : expected;
  return { item_id: itemId, contains, evidence: contains ? seedText.slice(0, 20) : "" };
}

export async function judgeP01(opts: {
  itemId: string;
  prompt: string;
  temperature: number;
  runs: number;
  expected: boolean;
  seedText: string;
}): Promise<{ contains: boolean; evidence: string; votes: Record<string, number> }> {
  const votes: Record<string, number> = { true: 0, false: 0 };
  let evidence = "";
  for (let i = 0; i < opts.runs; i++) {
    let r: P01Result;
    if (isMockMode()) {
      r = mock(opts.itemId, opts.expected, opts.seedText + i);
    } else {
      let raw = await callOnce(opts.prompt, opts.temperature);
      try {
        r = parse(raw);
      } catch {
        raw = await callOnce(opts.prompt, opts.temperature);
        r = parse(raw);
      }
    }
    votes[String(r.contains)] = (votes[String(r.contains)] ?? 0) + 1;
    if (r.contains && !evidence) evidence = r.evidence;
  }
  const contains = votes.true >= votes.false;
  return { contains, evidence, votes };
}
