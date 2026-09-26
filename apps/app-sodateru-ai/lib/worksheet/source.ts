import { CURRICULUM } from "@/lib/questions";
import worksheetKnowledge from "@/curriculum/generated/worksheet-knowledge.json";
import type { WorksheetSource } from "./types";

type WorksheetKnowledgeData = {
  units: Record<string, { code: string }>;
  knowledge: Record<string, { decisionCriteria: string; commonMisconceptions: string[] }>;
};
const extra = worksheetKnowledge as WorksheetKnowledgeData;

/**
 * 1単元分のプリント材料を作る（サーバ専用）。
 * 育てるAIのテストに出る assessment 問題は本文を含めず、ID だけを返す。
 */
export function buildWorksheetSource(unitId: string): WorksheetSource | null {
  const unit = CURRICULUM.units.find((item) => item.id === unitId);
  if (!unit) return null;
  const assessmentIds = new Set([
    ...(unit.assessmentQuestionIds ?? []),
    ...unit.questionBank.filter((q) => q.eligibility !== "practice").map((q) => q.id),
  ]);
  return {
    unitId: unit.id,
    unitCode: extra.units[unit.id]?.code ?? "",
    unitTitle: unit.title,
    summary: unit.description,
    knowledge: unit.knowledge.map((item) => ({
      id: item.id,
      label: item.label,
      description: item.description,
      decisionCriteria: extra.knowledge[item.id]?.decisionCriteria ?? "",
      commonMisconceptions: extra.knowledge[item.id]?.commonMisconceptions ?? [],
    })),
    practice: unit.questionBank
      .filter((q) => q.eligibility === "practice" && !assessmentIds.has(q.id))
      .map((q) => ({
        id: q.id,
        knowledgeIds: q.knowledgeIds,
        prompt: q.prompt,
        choices: q.choices.map((c) => ({ label: c.label, text: c.text })),
        answer: q.answer,
        explanation: q.explanation ?? "",
        misconception: q.misconceptionChoiceLabel && q.misconceptionRationale
          ? { choiceLabel: q.misconceptionChoiceLabel, description: q.misconceptionRationale }
          : null,
        difficulty: q.difficulty ?? "standard",
      })),
    assessmentQuestionIds: [...assessmentIds],
  };
}
