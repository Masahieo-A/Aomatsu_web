import { ExamMethod, SubjectCode, SubjectName } from "./types";

export type ChoiceSelections = Record<number, SubjectName[]>;

export function resolveBaseSubjects(
  method: ExamMethod | null,
  choiceSelections: ChoiceSelections
): SubjectCode[] {
  if (!method?.subjects) return [];
  const result: SubjectCode[] = [...method.subjects.required];
  method.subjects.choiceGroups.forEach((g, idx) => {
    const picked = choiceSelections[idx] ?? [];
    picked.forEach((subj) => {
      const code = g.from.find((c) => c.subject === subj);
      if (code) result.push(code);
    });
  });
  return result;
}

export function defaultChoiceSelections(method: ExamMethod | null): ChoiceSelections {
  if (!method?.subjects) return {};
  const sel: ChoiceSelections = {};
  method.subjects.choiceGroups.forEach((g, idx) => {
    sel[idx] = g.from.slice(0, g.pick).map((c) => c.subject);
  });
  return sel;
}
