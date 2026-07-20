/**
 * @zdp/schema
 * grammar_master.json の共有スキーマと検証ロジック。
 * ZDPアプリ（読み取り）とマスタアプリ（編集・エクスポート）の両方から参照される。
 * 要件: 文法項目マスタ_要件定義.md §2, §6 / ZDP_要件定義.md §6
 *
 * このスキーマを変更するときは必ず両アプリで同期すること。
 */
import { z } from "zod";

/** 現行スキーマバージョン（メジャー.マイナー）。フィールド追加=マイナー / 削除・意味変更=メジャー */
export const SCHEMA_VERSION = "1.0";

/** 項目のライフサイクル。memo→draft→verified→published→deprecated */
export const STATUS_VALUES = [
  "memo",
  "draft",
  "verified",
  "published",
  "deprecated",
] as const;
export type ItemStatus = (typeof STATUS_VALUES)[number];

export const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1"] as const;
export type CefrLevel = (typeof CEFR_LEVELS)[number];

export const PositiveExampleSchema = z.object({
  sentence: z.string().min(1),
  /** 文法項目に該当するスパン（該当部分の文字列） */
  span: z.string().default(""),
});
export type PositiveExample = z.infer<typeof PositiveExampleSchema>;

export const NegativeExampleSchema = z.object({
  sentence: z.string().min(1),
  /** なぜ該当しないのかの理由 */
  reason: z.string().default(""),
});
export type NegativeExample = z.infer<typeof NegativeExampleSchema>;

export const TestResultsSchema = z.object({
  last_tested_at: z.string().nullable().default(null),
  accuracy: z.number().min(0).max(1).nullable().default(null),
  runs: z.number().int().min(0).default(0),
});
export type TestResults = z.infer<typeof TestResultsSchema>;

/** ID規約: 'G' + 3桁連番。一度発行したIDは削除・再利用しない。 */
export const ID_PATTERN = /^G\d{3,}$/;

export const GrammarItemSchema = z.object({
  id: z.string().regex(ID_PATTERN, "id は 'G' + 3桁以上の連番"),
  name: z.string().min(1),
  name_en: z.string().default(""),
  status: z.enum(STATUS_VALUES),
  level: z.enum(CEFR_LEVELS),
  parent_id: z.string().nullable().default(null),
  prerequisites: z.array(z.string()).default([]),
  criteria: z.string().default(""),
  patterns: z.array(z.string()).default([]),
  positive_examples: z.array(PositiveExampleSchema).default([]),
  negative_examples: z.array(NegativeExampleSchema).default([]),
  common_misconceptions: z.array(z.string()).default([]),
  probe_template: z.string().default(""),
  notes: z.string().default(""),
  test_results: TestResultsSchema.default({
    last_tested_at: null,
    accuracy: null,
    runs: 0,
  }),
  created_at: z.string().default(() => new Date().toISOString()),
  updated_at: z.string().default(() => new Date().toISOString()),
  version: z.number().int().min(1).default(1),
});
export type GrammarItem = z.infer<typeof GrammarItemSchema>;

export const GrammarMasterSchema = z.object({
  schema_version: z.string(),
  exported_at: z.string().optional(),
  total: z.number().int().optional(),
  deprecated_ids: z.array(z.string()).default([]),
  items: z.array(GrammarItemSchema),
});
export type GrammarMaster = z.infer<typeof GrammarMasterSchema>;

/** verified への昇格条件（陽性例3件以上・陰性例2件以上） */
export const PROMOTE_MIN_POSITIVE = 3;
export const PROMOTE_MIN_NEGATIVE = 2;
/** verified 昇格に必要なテストベンチ基準 */
export const PROMOTE_MIN_ACCURACY = 0.9;
export const PROMOTE_MIN_RUNS = 10;

// ----------------------------------------------------------------
//  検証ユーティリティ（エクスポート時の V-1〜V-4）
// ----------------------------------------------------------------

export interface ValidationIssue {
  code: "V1_SCHEMA" | "V2_REFERENCE" | "V3_CYCLE" | "V4_DUPLICATE";
  itemId?: string;
  message: string;
}

export interface ValidationResult {
  ok: boolean;
  issues: ValidationIssue[];
}

/** V-1: スキーマ準拠（必須フィールド・型） */
export function validateSchema(items: unknown[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  items.forEach((raw, i) => {
    const r = GrammarItemSchema.safeParse(raw);
    if (!r.success) {
      const id = (raw as { id?: string })?.id ?? `#${i}`;
      const first = r.error.issues[0];
      issues.push({
        code: "V1_SCHEMA",
        itemId: id,
        message: `${id}: ${first.path.join(".")} - ${first.message}`,
      });
    }
  });
  return issues;
}

/** V-4: ID重複チェック */
export function validateUniqueIds(items: { id: string }[]): ValidationIssue[] {
  const seen = new Set<string>();
  const issues: ValidationIssue[] = [];
  for (const it of items) {
    if (seen.has(it.id)) {
      issues.push({
        code: "V4_DUPLICATE",
        itemId: it.id,
        message: `ID重複: ${it.id}`,
      });
    }
    seen.add(it.id);
  }
  return issues;
}

/**
 * V-2: 参照整合性。対象集合内の項目の prerequisites / parent_id が、
 * 同じ集合内に存在すること。
 * （エクスポートでは対象集合 = published のみ。未published前提を持つと中止。）
 */
export function validateReferences(
  items: GrammarItem[]
): ValidationIssue[] {
  const idSet = new Set(items.map((i) => i.id));
  const issues: ValidationIssue[] = [];
  for (const it of items) {
    if (it.parent_id && !idSet.has(it.parent_id)) {
      issues.push({
        code: "V2_REFERENCE",
        itemId: it.id,
        message: `${it.id} の parent_id「${it.parent_id}」が対象集合に存在しません（未published等）`,
      });
    }
    for (const p of it.prerequisites) {
      if (!idSet.has(p)) {
        issues.push({
          code: "V2_REFERENCE",
          itemId: it.id,
          message: `${it.id} の前提「${p}」が対象集合に存在しません（未published等）`,
        });
      }
    }
  }
  return issues;
}

/**
 * V-3: prerequisites による有向グラフに循環がないか（DAG検証）。
 * 循環がある場合は循環パスをメッセージに含める。
 */
export function validateDag(items: GrammarItem[]): ValidationIssue[] {
  const graph = new Map<string, string[]>();
  for (const it of items) {
    // 対象集合内に存在する前提のみ辿る（参照切れは V-2 の担当）
    graph.set(
      it.id,
      it.prerequisites.filter((p) => items.some((x) => x.id === p))
    );
  }
  const issues: ValidationIssue[] = [];
  const WHITE = 0,
    GRAY = 1,
    BLACK = 2;
  const color = new Map<string, number>();
  const stack: string[] = [];

  const visit = (node: string): boolean => {
    color.set(node, GRAY);
    stack.push(node);
    for (const next of graph.get(node) ?? []) {
      const c = color.get(next) ?? WHITE;
      if (c === GRAY) {
        const cycleStart = stack.indexOf(next);
        const path = [...stack.slice(cycleStart), next].join(" → ");
        issues.push({
          code: "V3_CYCLE",
          itemId: node,
          message: `循環参照を検出: ${path}`,
        });
        return true;
      }
      if (c === WHITE && visit(next)) return true;
    }
    stack.pop();
    color.set(node, BLACK);
    return false;
  };

  for (const it of items) {
    if ((color.get(it.id) ?? WHITE) === WHITE) {
      if (visit(it.id)) break; // 最初の循環で十分
    }
  }
  return issues;
}

/**
 * 保存時の循環検出（単一項目の prerequisites 追加に対して）。
 * マスタアプリが保存前に呼ぶ（要件 G-02）。
 */
export function wouldCreateCycle(
  items: GrammarItem[],
  candidate: { id: string; prerequisites: string[] }
): boolean {
  const map = new Map<string, string[]>();
  for (const it of items) {
    if (it.id === candidate.id) continue;
    map.set(it.id, it.prerequisites);
  }
  map.set(candidate.id, candidate.prerequisites);
  // candidate から辿って自分自身に戻れば循環
  const seen = new Set<string>();
  const dfs = (node: string): boolean => {
    if (node === candidate.id && seen.size > 0) return true;
    if (seen.has(node)) return false;
    seen.add(node);
    for (const n of map.get(node) ?? []) {
      if (n === candidate.id) return true;
      if (dfs(n)) return true;
    }
    return false;
  };
  for (const p of candidate.prerequisites) {
    seen.clear();
    if (dfs(p)) return true;
  }
  return false;
}

/**
 * エクスポート成果物を構築する（要件 §6.1, §6.2）。
 * published のみを対象に V-1〜V-4 を実行し、全て通過した場合のみ result.master を返す。
 */
export function buildExport(allItems: GrammarItem[]): {
  ok: boolean;
  issues: ValidationIssue[];
  master: GrammarMaster | null;
} {
  const published = allItems.filter((i) => i.status === "published");
  const issues: ValidationIssue[] = [
    ...validateSchema(published),
    ...validateUniqueIds(published),
    ...validateReferences(published),
    ...validateDag(published),
  ];
  if (issues.length > 0) {
    return { ok: false, issues, master: null };
  }
  const deprecated_ids = allItems
    .filter((i) => i.status === "deprecated")
    .map((i) => i.id);
  const master: GrammarMaster = {
    schema_version: SCHEMA_VERSION,
    exported_at: new Date().toISOString(),
    total: published.length,
    deprecated_ids,
    items: published,
  };
  return { ok: true, issues: [], master };
}

/** verified 昇格の可否を判定（B-05 の条件） */
export function canPromoteToVerified(item: GrammarItem): {
  ok: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];
  if (item.positive_examples.length < PROMOTE_MIN_POSITIVE)
    reasons.push(`陽性例が${PROMOTE_MIN_POSITIVE}件未満（現在${item.positive_examples.length}件）`);
  if (item.negative_examples.length < PROMOTE_MIN_NEGATIVE)
    reasons.push(`陰性例が${PROMOTE_MIN_NEGATIVE}件未満（現在${item.negative_examples.length}件）`);
  const acc = item.test_results.accuracy;
  if (acc == null || acc < PROMOTE_MIN_ACCURACY)
    reasons.push(`テスト正答率が${PROMOTE_MIN_ACCURACY * 100}%未満`);
  if (item.test_results.runs < PROMOTE_MIN_RUNS)
    reasons.push(`テスト実行回数が${PROMOTE_MIN_RUNS}回未満（現在${item.test_results.runs}回）`);
  return { ok: reasons.length === 0, reasons };
}

/** ZDPアプリが読み込み時に schema_version を照合するためのヘルパ（§6.4） */
export function isCompatibleVersion(version: string): boolean {
  const [maj] = version.split(".");
  const [curMaj] = SCHEMA_VERSION.split(".");
  // 同一メジャーなら互換（未知のマイナー・フィールドは無視して読める設計）
  return maj === curMaj;
}
