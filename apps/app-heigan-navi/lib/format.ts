import { Evidence, SubjectRequirement } from "./types";

export function formatDate(iso: string | null): string {
  if (!iso) return "未定";
  const [, m, d] = iso.split("-");
  return `${Number(m)}/${Number(d)}`;
}

export function formatSubjects(s: SubjectRequirement | null): string {
  if (!s) return "要確認";
  const parts: string[] = [];
  s.required.forEach((c) => parts.push(c.range ? `${c.subject}(${c.range})` : c.subject));
  s.choiceGroups.forEach((g) => {
    const names = g.from.map((c) => c.subject).join("/");
    parts.push(`{${names}から${g.pick}}`);
  });
  if (parts.length === 0 && s.nonAcademic.length > 0) return s.nonAcademic.join("・");
  if (s.nonAcademic.length > 0) parts.push(...s.nonAcademic);
  return parts.length > 0 ? parts.join("、") : "学科試験なし";
}

export function evidenceFor(evidence: Evidence[], fieldPrefix: string): Evidence[] {
  return evidence.filter((e) => e.field.startsWith(fieldPrefix));
}
