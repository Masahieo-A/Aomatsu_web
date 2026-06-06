/**
 * 添削結果を画面間で受け渡す（sessionStorage のキーと型、保存・読出し）を扱う。
 */
import type { InputType } from "./schema";
import type { OutputType } from "./schema";

export const EVALUATION_STORAGE_KEY = "eisaku-evaluation-v1";

export type EvaluationPayload = InputType & {
  result: OutputType;
};

export function saveEvaluationToSession(data: EvaluationPayload): void {
  if (typeof window === "undefined") {
    return;
  }
  sessionStorage.setItem(EVALUATION_STORAGE_KEY, JSON.stringify(data));
}

export function loadEvaluationFromSession(): EvaluationPayload | null {
  if (typeof window === "undefined") {
    return null;
  }
  const raw = sessionStorage.getItem(EVALUATION_STORAGE_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as EvaluationPayload;
  } catch {
    return null;
  }
}
