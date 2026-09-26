// 実行: node --test lib/worksheet/worksheet.test.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { buildRequestTsv, selectPracticeQuestions } from "./export.ts";
import { parseWorksheet } from "./parse.ts";

const runtime = JSON.parse(fs.readFileSync(new URL("../../curriculum/generated/g24-runtime.json", import.meta.url), "utf8"));
const extra = JSON.parse(fs.readFileSync(new URL("../../curriculum/generated/worksheet-knowledge.json", import.meta.url), "utf8"));

/** lib/worksheet/source.ts と同じ規則で材料を作る（@/ の別名を使わずにテストするため） */
function sourceOf(unit) {
  const assessmentIds = new Set([
    ...(unit.assessmentQuestionIds ?? []),
    ...unit.questionBank.filter((q) => q.eligibility !== "practice").map((q) => q.id),
  ]);
  return {
    unitId: unit.id,
    unitCode: extra.units[unit.id]?.code ?? "",
    unitTitle: unit.title,
    summary: unit.description,
    knowledge: unit.knowledge.map((k) => ({
      id: k.id, label: k.label, description: k.description,
      decisionCriteria: extra.knowledge[k.id]?.decisionCriteria ?? "",
      commonMisconceptions: extra.knowledge[k.id]?.commonMisconceptions ?? [],
    })),
    practice: unit.questionBank.filter((q) => q.eligibility === "practice" && !assessmentIds.has(q.id)).map((q) => ({
      id: q.id, knowledgeIds: q.knowledgeIds, prompt: q.prompt, choices: q.choices, answer: q.answer,
      explanation: q.explanation ?? "", misconception: null, difficulty: q.difficulty ?? "standard",
    })),
    assessmentQuestionIds: [...assessmentIds],
  };
}

const allOptions = (source, questionCount = 12) => ({
  selectedKnowledgeIds: source.knowledge.map((k) => k.id), questionCount, level: "standard",
});

test("全47単元で、書き出した材料に assessment 問題の ID が含まれない", () => {
  assert.equal(runtime.units.length, 47);
  for (const unit of runtime.units) {
    const source = sourceOf(unit);
    const tsv = buildRequestTsv(source, allOptions(source));
    const assessment = unit.questionBank.filter((q) => q.eligibility !== "practice").map((q) => q.id);
    assert.ok(assessment.length > 0, `${unit.id} に assessment 問題がない`);
    for (const id of assessment) assert.ok(!tsv.includes(`\t${id}\t`), `${unit.id}: ${id} が混入`);
    for (const id of unit.assessmentQuestionIds ?? []) assert.ok(!tsv.includes(`\t${id}\t`), `${unit.id}: ${id} が混入`);
  }
});

test("材料は決定的で、項目ごとに偏らず、最大 問題数×2 問", () => {
  const source = sourceOf(runtime.units.find((u) => u.id === "unit.lesson12"));
  const options = allOptions(source, 8);
  assert.equal(buildRequestTsv(source, options), buildRequestTsv(source, options));
  const picked = selectPracticeQuestions(source, options);
  assert.equal(picked.length, Math.min(16, source.practice.length));
  const perKnowledge = new Set(picked.slice(0, source.knowledge.length).map((q) => q.knowledgeIds[0]));
  assert.equal(perKnowledge.size, Math.min(source.knowledge.length, picked.length));
  const tsv = buildRequestTsv(source, options);
  assert.ok(tsv.startsWith("#SODATERU_WORKSHEET_REQUEST\tv1\n"));
  assert.ok(tsv.endsWith("\n#END"));
  for (const line of tsv.split("\n").filter((l) => l.startsWith("PRACTICE\t") && !l.startsWith("PRACTICE\tid"))) {
    assert.equal(line.split("\t").length, 11);
  }
});

// ---- 取り込みの検証 ----
const lesson1 = sourceOf(runtime.units.find((u) => u.id === "unit.lesson01"));
const ctx = {
  unitId: lesson1.unitId,
  selectedKnowledgeIds: lesson1.knowledge.map((k) => k.id),
  practice: lesson1.practice,
  assessmentQuestionIds: lesson1.assessmentQuestionIds,
};

function validWorksheet() {
  const questions = lesson1.practice.slice(0, 4).map((q, i) => ({
    no: i + 1, knowledgeId: q.knowledgeIds[0], sourceQuestionId: q.id, source: "bank",
    prompt: q.prompt, choices: q.choices, answer: q.answer, reasonPrompt: "決め手は？", explanation: "解説",
  }));
  return {
    format: "sodateru-worksheet", version: 1, unitId: lesson1.unitId, title: "文の種類 グループ準備シート", goal: "否定文の作り方を説明できる",
    checkQuestions: questions,
    ruleQuestions: lesson1.knowledge.map((k) => ({ knowledgeId: k.id, question: "どう見分ける？", hint: "", modelAnswer: "…" })),
    fixSouta: [
      { knowledgeId: lesson1.knowledge[0].id, soutaSays: "doesn't でいいですよね？", modelAnswer: "…" },
      { knowledgeId: lesson1.knowledge[1].id, soutaSays: "not を動詞の後ろに置きます", modelAnswer: "…" },
    ],
    exampleTasks: [{ knowledgeId: lesson1.knowledge[0].id, instruction: "学校生活の例文を作ろう" }],
    teachingPlan: { keywords: ["be動詞", "do/does"], orderHint: "be動詞から" },
  };
}
const fenced = (value) => "はい、作成しました。\n```json\n" + JSON.stringify(value, null, 2) + "\n```\nご確認ください。";

test("正しい出力はコードブロックや前後の文があっても取り込める", () => {
  const result = parseWorksheet(fenced(validWorksheet()), ctx);
  assert.deepEqual(result.errors, []);
  assert.equal(result.worksheet?.checkQuestions.length, 4);
});

test("壊れた JSON はエラー", () => {
  const result = parseWorksheet('```json\n{ "format": "sodateru-worksheet", "checkQuestions": [ \n```', ctx);
  assert.equal(result.worksheet, null);
  assert.match(result.errors[0], /JSON/);
});

test("単元違いはエラー", () => {
  const result = parseWorksheet(fenced({ ...validWorksheet(), unitId: "unit.lesson12" }), ctx);
  assert.equal(result.worksheet, null);
  assert.ok(result.errors.some((e) => e.includes("単元ID")));
});

test("正解が選択肢にないとエラー（新規問題）", () => {
  const ws = validWorksheet();
  ws.checkQuestions[0] = { ...ws.checkQuestions[0], source: "new", sourceQuestionId: null, answer: "E" };
  const result = parseWorksheet(fenced(ws), ctx);
  assert.equal(result.worksheet, null);
  assert.ok(result.errors.some((e) => e.includes("正解 E")));
});

test("bank 問題の正解が教材と違えば教材の正解に直して警告", () => {
  const ws = validWorksheet();
  const bankAnswer = ws.checkQuestions[0].answer;
  const wrong = ["A", "B", "C", "D"].find((l) => l !== bankAnswer);
  ws.checkQuestions[0] = { ...ws.checkQuestions[0], answer: wrong };
  const result = parseWorksheet(fenced(ws), ctx);
  assert.deepEqual(result.errors, []);
  assert.equal(result.worksheet?.checkQuestions[0].answer, bankAnswer);
  assert.ok(result.warnings.some((w) => w.includes("教材データの正解に直しました")));
});

test("assessment 問題の ID が混ざると取り込み拒否", () => {
  const ws = validWorksheet();
  ws.checkQuestions[0] = { ...ws.checkQuestions[0], sourceQuestionId: lesson1.assessmentQuestionIds[0] };
  const result = parseWorksheet(fenced(ws), ctx);
  assert.equal(result.worksheet, null);
  assert.ok(result.errors.some((e) => e.includes("テスト用問題")));
});

test("選んでいない知識項目はエラー、確認問題の数が範囲外もエラー", () => {
  const ws = validWorksheet();
  const narrow = { ...ctx, selectedKnowledgeIds: [lesson1.knowledge[0].id] };
  assert.ok(parseWorksheet(fenced(ws), narrow).errors.some((e) => e.includes("含まれていません")));
  const few = { ...ws, checkQuestions: ws.checkQuestions.slice(0, 2) };
  assert.ok(parseWorksheet(fenced(few), ctx).errors.some((e) => e.includes("4〜12問")));
});
