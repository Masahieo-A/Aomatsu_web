import type {
  Worksheet,
  WorksheetCheckQuestion,
  WorksheetChoice,
  WorksheetExampleTask,
  WorksheetFixSouta,
  WorksheetParseResult,
  WorksheetPracticeQuestion,
  WorksheetRuleQuestion,
} from "./types";

export const WORKSHEET_FORMAT = "sodateru-worksheet";
export const WORKSHEET_VERSION = 1;

/** 印刷レイアウトに収まる文字数の目安（超えたら警告のみ） */
export const TEXT_LIMITS = {
  title: 40,
  goal: 60,
  prompt: 200,
  choice: 60,
  reasonPrompt: 40,
  explanation: 120,
  question: 80,
  hint: 40,
  modelAnswer: 120,
  soutaSays: 80,
  instruction: 60,
  keyword: 20,
  orderHint: 80,
} as const;

export const COUNT_LIMITS = {
  checkQuestions: { min: 4, max: 12 },
  rulePerKnowledge: { min: 1, max: 2 },
  fixSouta: { min: 2, max: 4 },
  exampleTasks: { min: 1, max: 3 },
  keywords: { max: 8 },
} as const;

const LABELS = ["A", "B", "C", "D"];

export type WorksheetParseContext = {
  unitId: string;
  selectedKnowledgeIds: string[];
  practice: WorksheetPracticeQuestion[];
  assessmentQuestionIds: string[];
};

/** コードブロック記号や前後の説明文を除き、最初の { から最後の } までを JSON として読む */
export function extractJson(text: string): { value: unknown; error: string | null } {
  const cleaned = text.replace(/```[a-zA-Z]*\s*/g, "").replace(/```/g, "").replace(/^﻿/, "");
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end <= start) {
    return { value: null, error: "JSON（{ から始まるデータ）が見つかりません。AIの出力のコードブロックを丸ごと貼ってください。" };
  }
  const body = cleaned.slice(start, end + 1);
  try {
    return { value: JSON.parse(body), error: null };
  } catch {
    // AIが付けがちな「最後の要素の後ろのカンマ」だけは直して再挑戦する
    try {
      return { value: JSON.parse(body.replace(/,\s*([}\]])/g, "$1")), error: null };
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      return { value: null, error: `JSONとして読み取れません（${detail}）。出力が途中で切れていないか確認してください。` };
    }
  }
}

type Reporter = { errors: string[]; warnings: string[] };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readText(
  record: Record<string, unknown>,
  key: string,
  where: string,
  itemName: string,
  limit: number,
  report: Reporter,
  required = true,
): string {
  const raw = record[key];
  if (raw === undefined || raw === null || raw === "") {
    if (required) report.errors.push(`${where}：「${itemName}」（${key}）がありません。`);
    return "";
  }
  if (typeof raw !== "string" && typeof raw !== "number") {
    report.errors.push(`${where}：「${itemName}」（${key}）は文字列にしてください。`);
    return "";
  }
  const text = String(raw).trim();
  if ([...text].length > limit) {
    report.warnings.push(`${where}：「${itemName}」が${[...text].length}字です（目安${limit}字）。印刷ではみ出す可能性があります。`);
  }
  return text;
}

function readArray(record: Record<string, unknown>, key: string, name: string, report: Reporter): unknown[] {
  const raw = record[key];
  if (!Array.isArray(raw)) {
    report.errors.push(`「${name}」（${key}）がリスト形式ではありません。`);
    return [];
  }
  return raw;
}

function checkKnowledgeId(value: string, where: string, selected: Set<string>, report: Reporter) {
  if (value && !selected.has(value)) {
    report.errors.push(`${where}：知識項目ID「${value}」は今回選んだ項目に含まれていません。`);
  }
}

function sameChoices(a: WorksheetChoice[], b: WorksheetChoice[]): boolean {
  return a.length === b.length && a.every((choice, i) => choice.label === b[i]?.label && choice.text === b[i]?.text);
}

function parseCheckQuestion(
  raw: unknown,
  index: number,
  selected: Set<string>,
  practiceById: Map<string, WorksheetPracticeQuestion>,
  assessment: Set<string>,
  report: Reporter,
): WorksheetCheckQuestion | null {
  const where = `確認問題${index + 1}`;
  if (!isRecord(raw)) {
    report.errors.push(`${where}：形式が正しくありません。`);
    return null;
  }
  const knowledgeId = readText(raw, "knowledgeId", where, "知識項目ID", 200, report);
  checkKnowledgeId(knowledgeId, where, selected, report);
  const sourceQuestionId = typeof raw.sourceQuestionId === "string" && raw.sourceQuestionId.trim() ? raw.sourceQuestionId.trim() : null;
  let prompt = readText(raw, "prompt", where, "問題文", TEXT_LIMITS.prompt, report);
  let answer = readText(raw, "answer", where, "正解", 3, report).replace(/[^A-Za-z]/g, "").toUpperCase();
  const reasonPrompt = readText(raw, "reasonPrompt", where, "決め手の問い", TEXT_LIMITS.reasonPrompt, report, false)
    || "なぜその答え？ 決め手を書こう。";
  let explanation = readText(raw, "explanation", where, "解説", TEXT_LIMITS.explanation, report, false);

  let choices: WorksheetChoice[] = [];
  if (!Array.isArray(raw.choices)) {
    report.errors.push(`${where}：選択肢（choices）がリスト形式ではありません。`);
  } else {
    if (raw.choices.length !== 4) report.errors.push(`${where}：選択肢は4つにしてください（今は${raw.choices.length}つ）。`);
    choices = raw.choices.map((choice, i) => {
      const record = isRecord(choice) ? choice : {};
      const label = typeof record.label === "string" ? record.label.trim().toUpperCase() : "";
      const text = readText(record, "text", `${where} 選択肢${i + 1}`, "選択肢の文", TEXT_LIMITS.choice, report);
      return { label, text };
    });
    const labels = choices.map((c) => c.label);
    if (labels.some((label) => !LABELS.includes(label)) || new Set(labels).size !== labels.length) {
      report.errors.push(`${where}：選択肢の記号は A〜D を重複なく使ってください（今は ${labels.join(",") || "なし"}）。`);
    }
    if (answer && !labels.includes(answer)) {
      report.errors.push(`${where}：正解 ${answer} が選択肢にありません。`);
    }
  }

  if (sourceQuestionId && assessment.has(sourceQuestionId)) {
    report.errors.push(`${where}：問題ID「${sourceQuestionId}」は育てるAIのテスト用問題なのでプリントに使えません。別の問題にしてください。`);
    return null;
  }

  let source: "bank" | "new" = raw.source === "bank" ? "bank" : "new";
  const bank = sourceQuestionId ? practiceById.get(sourceQuestionId) : undefined;
  if (sourceQuestionId && !bank) {
    if (source === "bank") report.errors.push(`${where}：問題ID「${sourceQuestionId}」は材料の練習問題にありません。`);
  } else if (bank) {
    source = "bank";
    // 教材JSONの値を正とする
    const bankChoices = bank.choices.map((c) => ({ label: c.label, text: c.text }));
    if (answer !== bank.answer || !sameChoices(choices, bankChoices) || prompt !== bank.prompt.trim()) {
      if (answer && answer !== bank.answer) {
        report.warnings.push(`${where}：正解が教材データ（${bank.answer}）と違ったため、教材データの正解に直しました。`);
      }
      prompt = bank.prompt.trim();
      choices = bankChoices;
      answer = bank.answer;
    }
    if (!explanation) explanation = bank.explanation;
  } else if (source === "bank") {
    report.errors.push(`${where}：source が "bank" なのに sourceQuestionId がありません。`);
  }
  if (!explanation) report.warnings.push(`${where}：解説がありません（解答ページが空欄になります）。`);

  return { no: index + 1, knowledgeId, sourceQuestionId: bank ? bank.id : sourceQuestionId, source, prompt, choices, answer, reasonPrompt, explanation };
}

/** サブスクAIの出力を読み、検証して Worksheet にする */
export function parseWorksheet(text: string, ctx: WorksheetParseContext): WorksheetParseResult {
  const report: Reporter = { errors: [], warnings: [] };
  if (!text.trim()) return { worksheet: null, errors: ["貼り付け欄が空です。"], warnings: [] };

  const { value, error } = extractJson(text);
  if (error) return { worksheet: null, errors: [error], warnings: [] };
  if (!isRecord(value)) return { worksheet: null, errors: ["データの一番外側が { } の形ではありません。"], warnings: [] };

  if (value.format !== WORKSHEET_FORMAT) {
    report.errors.push(`format が "${WORKSHEET_FORMAT}" ではありません。システムプロンプトが設定されたAIで作り直してください。`);
  }
  if (Number(value.version) !== WORKSHEET_VERSION) {
    report.errors.push(`version が ${WORKSHEET_VERSION} ではありません（今は ${String(value.version)}）。`);
  }
  if (value.unitId !== ctx.unitId) {
    report.errors.push(`単元ID「${String(value.unitId)}」が、選択中の単元「${ctx.unitId}」と違います。材料をコピーし直してください。`);
  }

  const selected = new Set(ctx.selectedKnowledgeIds);
  const practiceById = new Map(ctx.practice.map((q) => [q.id, q]));
  const assessment = new Set(ctx.assessmentQuestionIds);

  const title = readText(value, "title", "全体", "タイトル", TEXT_LIMITS.title, report);
  const goal = readText(value, "goal", "全体", "今日のゴール", TEXT_LIMITS.goal, report);

  // 確認問題
  const checkRaw = readArray(value, "checkQuestions", "確認問題", report);
  const { min: checkMin, max: checkMax } = COUNT_LIMITS.checkQuestions;
  if (Array.isArray(value.checkQuestions) && (checkRaw.length < checkMin || checkRaw.length > checkMax)) {
    report.errors.push(`確認問題は${checkMin}〜${checkMax}問にしてください（今は${checkRaw.length}問）。`);
  }
  const checkQuestions = checkRaw
    .map((raw, i) => parseCheckQuestion(raw, i, selected, practiceById, assessment, report))
    .filter((q): q is WorksheetCheckQuestion => q !== null)
    .map((q, i) => ({ ...q, no: i + 1 }));
  const seen = new Set<string>();
  for (const q of checkQuestions) {
    if (!q.sourceQuestionId) continue;
    if (seen.has(q.sourceQuestionId)) report.warnings.push(`確認問題${q.no}：同じ問題（${q.sourceQuestionId}）が2回使われています。`);
    seen.add(q.sourceQuestionId);
  }

  // ルールを言葉にする質問
  const ruleRaw = readArray(value, "ruleQuestions", "ルールを言葉にしよう", report);
  const ruleQuestions: WorksheetRuleQuestion[] = ruleRaw.flatMap((raw, i) => {
    const where = `ルール質問${i + 1}`;
    if (!isRecord(raw)) { report.errors.push(`${where}：形式が正しくありません。`); return []; }
    const knowledgeId = readText(raw, "knowledgeId", where, "知識項目ID", 200, report);
    checkKnowledgeId(knowledgeId, where, selected, report);
    return [{
      knowledgeId,
      question: readText(raw, "question", where, "質問", TEXT_LIMITS.question, report),
      hint: readText(raw, "hint", where, "ヒント", TEXT_LIMITS.hint, report, false),
      modelAnswer: readText(raw, "modelAnswer", where, "模範解答", TEXT_LIMITS.modelAnswer, report, false),
    }];
  });
  if (Array.isArray(value.ruleQuestions) && ruleRaw.length === 0) report.errors.push("「ルールを言葉にしよう」の質問が1つもありません。");
  for (const id of ctx.selectedKnowledgeIds) {
    const count = ruleQuestions.filter((q) => q.knowledgeId === id).length;
    if (count < COUNT_LIMITS.rulePerKnowledge.min) report.warnings.push(`知識項目「${id}」についての「ルールを言葉にしよう」の質問がありません。`);
    if (count > COUNT_LIMITS.rulePerKnowledge.max) report.warnings.push(`知識項目「${id}」についての質問が${count}個あります（目安は2個まで）。`);
  }

  // ソウタの間違いを直そう
  const fixRaw = readArray(value, "fixSouta", "ソウタの間違いを直そう", report);
  const fixSouta: WorksheetFixSouta[] = fixRaw.flatMap((raw, i) => {
    const where = `ソウタの間違い${i + 1}`;
    if (!isRecord(raw)) { report.errors.push(`${where}：形式が正しくありません。`); return []; }
    const knowledgeId = readText(raw, "knowledgeId", where, "知識項目ID", 200, report);
    checkKnowledgeId(knowledgeId, where, selected, report);
    return [{
      knowledgeId,
      soutaSays: readText(raw, "soutaSays", where, "ソウタの発言", TEXT_LIMITS.soutaSays, report),
      modelAnswer: readText(raw, "modelAnswer", where, "直し方", TEXT_LIMITS.modelAnswer, report, false),
    }];
  });
  if (Array.isArray(value.fixSouta)) {
    if (fixRaw.length === 0) report.errors.push("「ソウタの間違いを直そう」が1つもありません。");
    else if (fixRaw.length < COUNT_LIMITS.fixSouta.min || fixRaw.length > COUNT_LIMITS.fixSouta.max) {
      report.warnings.push(`「ソウタの間違いを直そう」は${COUNT_LIMITS.fixSouta.min}〜${COUNT_LIMITS.fixSouta.max}個が目安です（今は${fixRaw.length}個）。`);
    }
  }

  // 例文づくり
  const exampleRaw = readArray(value, "exampleTasks", "例文を作ろう", report);
  const exampleTasks: WorksheetExampleTask[] = exampleRaw.flatMap((raw, i) => {
    const where = `例文${i + 1}`;
    if (!isRecord(raw)) { report.errors.push(`${where}：形式が正しくありません。`); return []; }
    const knowledgeId = readText(raw, "knowledgeId", where, "知識項目ID", 200, report);
    checkKnowledgeId(knowledgeId, where, selected, report);
    return [{ knowledgeId, instruction: readText(raw, "instruction", where, "指示", TEXT_LIMITS.instruction, report) }];
  });
  if (Array.isArray(value.exampleTasks)) {
    if (exampleRaw.length === 0) report.errors.push("「例文を作ろう」が1つもありません。");
    else if (exampleRaw.length > COUNT_LIMITS.exampleTasks.max) {
      report.warnings.push(`「例文を作ろう」は${COUNT_LIMITS.exampleTasks.max}個までが目安です（今は${exampleRaw.length}個）。`);
    }
  }

  // 作戦メモ
  let teachingPlan = { keywords: [] as string[], orderHint: "" };
  if (!isRecord(value.teachingPlan)) {
    report.errors.push("「作戦メモ」（teachingPlan）がありません。");
  } else {
    const plan = value.teachingPlan;
    const keywords = Array.isArray(plan.keywords)
      ? plan.keywords.filter((k): k is string => typeof k === "string" && k.trim() !== "").map((k) => k.trim())
      : [];
    if (keywords.length === 0) report.warnings.push("作戦メモのキーワードがありません。");
    if (keywords.length > COUNT_LIMITS.keywords.max) report.warnings.push(`キーワードは${COUNT_LIMITS.keywords.max}個までが目安です（今は${keywords.length}個）。`);
    for (const k of keywords) {
      if ([...k].length > TEXT_LIMITS.keyword) report.warnings.push(`キーワード「${k}」が長すぎます（目安${TEXT_LIMITS.keyword}字）。`);
    }
    teachingPlan = { keywords, orderHint: readText(plan, "orderHint", "作戦メモ", "教える順番のヒント", TEXT_LIMITS.orderHint, report, false) };
  }

  if (report.errors.length > 0) return { worksheet: null, errors: report.errors, warnings: report.warnings };
  const worksheet: Worksheet = {
    format: WORKSHEET_FORMAT,
    version: WORKSHEET_VERSION,
    unitId: ctx.unitId,
    title,
    goal,
    checkQuestions,
    ruleQuestions,
    fixSouta,
    exampleTasks,
    teachingPlan,
  };
  return { worksheet, errors: [], warnings: report.warnings };
}
