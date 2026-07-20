import raw from "@/data/exam-methods.json";
import { ExamMethod } from "./types";

export const examMethods: ExamMethod[] = (raw as ExamMethod[]).filter(
  (m) => m.reviewStatus === "confirmed"
);

export function universities(): string[] {
  return Array.from(new Set(examMethods.map((m) => m.university)));
}

export function facultiesOf(university: string): string[] {
  return Array.from(
    new Set(examMethods.filter((m) => m.university === university).map((m) => m.faculty))
  );
}

export function departmentsOf(university: string, faculty: string): string[] {
  return Array.from(
    new Set(
      examMethods
        .filter((m) => m.university === university && m.faculty === faculty)
        .map((m) => m.department)
    )
  );
}

export function methodsFor(university: string, faculty: string, department: string): ExamMethod[] {
  return examMethods
    .filter(
      (m) => m.university === university && m.faculty === faculty && m.department === department
    )
    .sort((a, b) => (a.schedule?.examDates[0] ?? "9999").localeCompare(b.schedule?.examDates[0] ?? "9999"));
}

export function methodsOfUniversity(university: string): ExamMethod[] {
  return examMethods.filter((m) => m.university === university);
}

export const DATA_LAST_UPDATED = "2026-07-06";
