// 受信データの検証・型変換。サーバー専用（クライアントから import しない）。
// 生徒は未ログインのため、サーバー側で値の形・長さ・クラスを必ず確かめる。
import type { Settings, Side } from "@/lib/types";
import { getArticle, getPoint } from "@/lib/content";
import type { CardInput, HintInput, StancePatch } from "./db";

export type Checked<T> = { ok: true; value: T } | { ok: false; error: string };

const fail = (error: string): { ok: false; error: string } => ({ ok: false, error });

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** 文字列をトリムし、制御文字を除き、長さを上限で切る。改行・タブは空白1つにする */
export function cleanText(v: unknown, max: number): string {
  if (typeof v !== "string") return "";
  const s = v
    .replace(/[\r\n\t]+/g, " ")
    .replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u2028\u2029\uFEFF]/g, "")
    .trim();
  return Array.from(s).slice(0, max).join("");
}

function asInt(v: unknown, min: number, max: number): number | null {
  const n = typeof v === "string" && v.trim() !== "" ? Number(v) : v;
  if (typeof n !== "number" || !Number.isInteger(n) || n < min || n > max) return null;
  return n;
}

export type ParsedSync =
  | { kind: "stance"; classId: string; number: number; patch: StancePatch }
  | { kind: "card"; card: CardInput }
  | { kind: "hint"; hint: HintInput };

export function parseSync(body: unknown, classes: string[]): Checked<ParsedSync> {
  if (!isObject(body)) return fail("送信内容が正しくありません");
  const classId = typeof body.classId === "string" ? body.classId : "";
  if (!classes.includes(classId)) return fail("クラスが正しくありません");
  const number = asInt(body.number, 1, 60);
  if (number === null) return fail("出席番号は1〜60の整数で入力してください");
  const p = body.payload;
  if (!isObject(p)) return fail("送信内容が正しくありません");

  if (body.kind === "stance") {
    const patch: StancePatch = {};
    if (p.stanceBefore != null) {
      const n = asInt(p.stanceBefore, 1, 5);
      if (n === null) return fail("立場は1〜5の整数で送ってください");
      patch.stanceBefore = n;
    }
    if (p.stanceAfter != null) {
      const n = asInt(p.stanceAfter, 1, 5);
      if (n === null) return fail("立場は1〜5の整数で送ってください");
      patch.stanceAfter = n;
    }
    if (p.stanceReason != null) {
      patch.stanceReason = cleanText(p.stanceReason, 200) || null;
    }
    if (Object.keys(patch).length === 0) return fail("送る項目がありません");
    return { ok: true, value: { kind: "stance", classId, number, patch } };
  }

  if (body.kind === "card") {
    const articleId = typeof p.articleId === "string" ? p.articleId : "";
    const article = getArticle(articleId);
    if (!article) return fail("記事が正しくありません");
    const point = typeof p.point === "string" ? p.point : "";
    if (!getPoint(point)) return fail("Point が正しくありません");
    // side は記事から決める（端末から来た値は信用しない）
    const side: Side = article.side;
    return {
      ok: true,
      value: {
        kind: "card",
        card: {
          classId,
          number,
          articleId,
          side,
          point,
          sourceSentence: cleanText(p.sourceSentence, 300),
          fact: cleanText(p.fact, 300),
          numberExample: cleanText(p.numberExample, 150),
          soWhat: cleanText(p.soWhat, 300),
          weakPoint: cleanText(p.weakPoint, 300),
        },
      },
    };
  }

  if (body.kind === "hint") {
    const articleId = typeof p.articleId === "string" ? p.articleId : "";
    if (!getArticle(articleId)) return fail("記事が正しくありません");
    if (p.level !== "lv1" && p.level !== "lv2") return fail("レベルが正しくありません");
    const paragraph = asInt(p.paragraph, 0, 99);
    const hint = asInt(p.hint, 1, 3);
    if (paragraph === null || hint === null) return fail("ヒントの内容が正しくありません");
    return {
      ok: true,
      value: { kind: "hint", hint: { classId, number, articleId, level: p.level, paragraph, hint: hint as 1 | 2 | 3 } },
    };
  }

  return fail("送信の種類が正しくありません");
}

/** 教員が保存する設定の検証。classes は "3-1" 形式 */
export function parseSettings(v: unknown): Checked<Settings> {
  if (!isObject(v)) return fail("設定の形が正しくありません");
  if (!Array.isArray(v.classes) || v.classes.length < 1 || v.classes.length > 30) {
    return fail("クラスは1〜30件で指定してください");
  }
  const classes: string[] = [];
  for (const c of v.classes) {
    if (typeof c !== "string" || !/^[1-9]\d?-[1-9]\d?$/.test(c)) {
      return fail("クラスは「3-1」の形で入力してください");
    }
    if (!classes.includes(c)) classes.push(c);
  }
  if (typeof v.soWhatJaAllowed !== "boolean" || typeof v.trapRequired !== "boolean") {
    return fail("チェック項目の値が正しくありません");
  }
  const wordMin = asInt(v.wordMin, 1, 2000);
  const wordMax = asInt(v.wordMax, 1, 2000);
  if (wordMin === null || wordMax === null) return fail("目標語数は整数で入力してください");
  if (wordMin >= wordMax) return fail("目標語数は 最小 < 最大 にしてください");
  return {
    ok: true,
    value: { classes, soWhatJaAllowed: v.soWhatJaAllowed, wordMin, wordMax, trapRequired: v.trapRequired },
  };
}

/** クラス指定（任意）。"3-1" 形式のみ許可 */
export function parseOptionalClassId(v: unknown): Checked<string | undefined> {
  if (v === undefined || v === null || v === "") return { ok: true, value: undefined };
  if (typeof v !== "string" || !/^[1-9]\d?-[1-9]\d?$/.test(v)) return fail("クラスの指定が正しくありません");
  return { ok: true, value: v };
}
