/**
 * @zdp/prompts
 * ZDP_プロンプト設計.md 由来のプロンプトテンプレートを共有する。
 * テンプレート本文は packages/prompts/templates/*.md が正（human-editable）。
 * それを sync-from-design.mjs が templates.gen.ts に変換し、ここから読み込む。
 *
 * 重要: マスタアプリのテストベンチと ZDPアプリの P-01 は必ずこの同一テンプレートを使う
 * （文法項目マスタ_要件定義.md §4 の要求）。
 */
import { TEMPLATES } from "./templates.gen";

/** プロンプトバージョン（全API呼び出しログに記録する / 要件 §7） */
export const PROMPT_VERSION = "1.0";

export type PromptId = "P-01" | "P-02" | "P-03" | "P-04" | "P-05" | "P-06";

/** 各プロンプトの実行パラメータ（要件 §7 の表） */
export const PROMPT_CONFIG: Record<
  PromptId,
  { temperature: number; selfConsistency: number }
> = {
  "P-01": { temperature: 0.7, selfConsistency: 3 },
  "P-02": { temperature: 0.3, selfConsistency: 1 },
  "P-03": { temperature: 0.7, selfConsistency: 1 },
  "P-04": { temperature: 0.1, selfConsistency: 1 },
  "P-05": { temperature: 0.5, selfConsistency: 1 },
  "P-06": { temperature: 0.1, selfConsistency: 3 },
};

export function getTemplate(id: PromptId): string {
  const t = TEMPLATES[id];
  if (!t) throw new Error(`prompt template not found: ${id}. run 'npm run sync-prompts'`);
  return t;
}

/**
 * テンプレートの {{path.to.var}} を values で置換する。
 * ネストしたキーはドット区切りで解決（例: {{item.name}}）。
 * 未定義のプレースホルダは空文字にする。
 */
export function render(
  id: PromptId,
  values: Record<string, unknown>
): string {
  const template = getTemplate(id);
  return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_m, path: string) => {
    const val = resolvePath(values, path);
    if (val == null) return "";
    if (typeof val === "string") return val;
    if (Array.isArray(val)) return formatArray(val);
    if (typeof val === "object") return JSON.stringify(val);
    return String(val);
  });
}

function resolvePath(obj: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object") {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

/** 配列は箇条書き文字列に整形（陽性例/陰性例/パターン等の few-shot 注入用） */
function formatArray(arr: unknown[]): string {
  return arr
    .map((el) => {
      if (typeof el === "string") return `- ${el}`;
      if (el && typeof el === "object") {
        const o = el as Record<string, unknown>;
        if ("sentence" in o) {
          const extra = o.span
            ? `（該当: ${o.span}）`
            : o.reason
            ? `（理由: ${o.reason}）`
            : "";
          return `- ${o.sentence}${extra}`;
        }
        return `- ${JSON.stringify(o)}`;
      }
      return `- ${String(el)}`;
    })
    .join("\n");
}
