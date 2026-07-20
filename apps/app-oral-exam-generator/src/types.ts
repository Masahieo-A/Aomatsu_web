import { z } from "zod";

// ---------------------------------------------------------------------------
// テーブル名（スプレッドシートのタブ名 / JSONファイル名と1対1対応）
// ---------------------------------------------------------------------------

export const TABLE_NAMES = [
  "assignments",
  "submissions",
  "questions",
  "results",
] as const;

export type TableName = (typeof TABLE_NAMES)[number];

// ---------------------------------------------------------------------------
// assignments（課題）
// ---------------------------------------------------------------------------

export const AssignmentModeSchema = z.enum(["idea", "logic", "vocab"]);
export type AssignmentMode = z.infer<typeof AssignmentModeSchema>;

export const AssignmentSchema = z.object({
  assignment_id: z.string(),
  title: z.string().min(1),
  mode: AssignmentModeSchema,
  question_count: z.number().int().min(1).max(5),
  created_at: z.string(), // ISO datetime
});
export type Assignment = z.infer<typeof AssignmentSchema>;

export const AssignmentCreateSchema = AssignmentSchema.omit({
  assignment_id: true,
  created_at: true,
}).extend({
  question_count: z.number().int().min(1).max(5).default(3),
});
export type AssignmentCreate = z.infer<typeof AssignmentCreateSchema>;

// ---------------------------------------------------------------------------
// submissions（提出英文）
// ---------------------------------------------------------------------------

export const SubmissionStatusSchema = z.enum([
  "submitted",
  "analyzed",
  "generated",
  "approved",
]);
export type SubmissionStatus = z.infer<typeof SubmissionStatusSchema>;

export const AnchorTypeSchema = z.enum(["pronoun", "marker"]);

export const AnalysisSchema = z.object({
  sentences: z.array(z.object({ index: z.number(), text: z.string() })),
  anchors: z.array(
    z.object({
      type: AnchorTypeSchema,
      word: z.string(),
      sentence_index: z.number(),
      char_offset: z.number(),
    })
  ),
  difficult_words: z.array(
    z.object({
      word: z.string(),
      level: z.string(),
      sentence_index: z.number(),
    })
  ),
  word_count: z.number(),
  validation_errors: z.array(z.string()),
});
export type Analysis = z.infer<typeof AnalysisSchema>;

export const SubmissionSchema = z.object({
  submission_id: z.string(),
  assignment_id: z.string(),
  student_label: z.string().min(1),
  text: z.string().min(1),
  status: SubmissionStatusSchema,
  analysis: AnalysisSchema.nullable(),
});
export type Submission = z.infer<typeof SubmissionSchema>;

// ---------------------------------------------------------------------------
// questions（生成された問い：候補も不合格も全件保存＝トレーサビリティ）
// ---------------------------------------------------------------------------

export const QuestionTypeSchema = z.number().int().min(1).max(5);

export const QuestionStatusSchema = z.enum([
  "candidate",
  "rejected",
  "selected",
  "replaced",
  "approved",
]);
export type QuestionStatus = z.infer<typeof QuestionStatusSchema>;

export const QuestionAnchorSchema = z.object({
  sentence_index: z.number(),
  quoted_span: z.string(),
});
export type QuestionAnchor = z.infer<typeof QuestionAnchorSchema>;

export const GateResultSchema = z.object({
  pass: z.boolean(),
  detail: z.unknown(),
});
export type GateResult = z.infer<typeof GateResultSchema>;

export const QuestionSchema = z.object({
  question_id: z.string(),
  submission_id: z.string(),
  type: QuestionTypeSchema,
  anchor: QuestionAnchorSchema,
  question_text: z.string(),
  model_answer: z.string(),
  acceptable_conditions: z.string(),
  typical_wrong: z.string(),
  scoring_steps: z.string(),
  difficulty_score: z.number(),
  gate1: GateResultSchema.nullable(),
  gate2: GateResultSchema.nullable(),
  gate3: GateResultSchema.nullable(),
  status: QuestionStatusSchema,
  prompt_version: z.string(),
  model_id: z.string(),
  /** 教員がレビュー画面で手動編集した場合に true（教員修正率KPIの元データ） */
  edited: z.boolean().optional(),
});
export type Question = z.infer<typeof QuestionSchema>;

// ---------------------------------------------------------------------------
// results（採点結果：Phase 3）
// ---------------------------------------------------------------------------

export const ResultSchema = z.object({
  question_id: z.string(),
  student_label: z.string(),
  score: z.union([z.literal(0), z.literal(1)]),
  scored_at: z.string(),
});
export type Result = z.infer<typeof ResultSchema>;

// ---------------------------------------------------------------------------
// テーブル名 → 行型 のマッピング
// ---------------------------------------------------------------------------

export type TableRowMap = {
  assignments: Assignment;
  submissions: Submission;
  questions: Question;
  results: Result;
};
