"use client";

import { ChoiceSelections } from "@/lib/baseSubjects";
import { ExamMethod, SubjectName } from "@/lib/types";
import { Badge } from "./Badge";

export default function BaseSubjectPanel({
  method,
  choiceSelections,
  onChangeChoice,
}: {
  method: ExamMethod;
  choiceSelections: ChoiceSelections;
  onChangeChoice: (groupIdx: number, subject: SubjectName) => void;
}) {
  if (!method.subjects) return null;
  return (
    <div className="sticky top-0 z-10 rounded-lg border border-blue-400 bg-blue-50 p-3 print:static print:border-zinc-400">
      <p className="text-xs font-medium text-blue-700">基準方式：{method.university} {method.faculty} / {method.methodName}</p>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        {method.subjects.required.map((c) => (
          <Badge key={c.subject} color="blue">
            {c.subject}
            {c.range ? `(${c.range})` : ""}
          </Badge>
        ))}
        {method.subjects.choiceGroups.map((g, idx) => (
          <label key={idx} className="flex items-center gap-1 text-xs">
            <span className="text-zinc-500">
              {g.from.map((c) => c.subject).join("/")}から{g.pick}:
            </span>
            <select
              className="rounded border border-zinc-300 bg-white px-1 py-0.5 print:hidden"
              value={choiceSelections[idx]?.[0] ?? ""}
              onChange={(e) => onChangeChoice(idx, e.target.value as SubjectName)}
            >
              {g.from.map((c) => (
                <option key={c.subject} value={c.subject}>
                  {c.subject}
                </option>
              ))}
            </select>
            <span className="hidden print:inline">{choiceSelections[idx]?.[0]}</span>
          </label>
        ))}
        {method.subjects.nonAcademic.length > 0 && (
          <Badge color="purple">{method.subjects.nonAcademic.join("・")}</Badge>
        )}
      </div>
    </div>
  );
}
