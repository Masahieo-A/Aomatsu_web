import { z } from "zod";
import { Type } from "@google/genai";
import { getStorage } from "@/lib/storage/adapter";
import { preprocess, textWithSentenceNumbers } from "@/lib/nlp/preprocess";
import { generateJson, MODELS } from "@/lib/llm/gemini";
import { loadPrompt, renderPrompt } from "@/lib/llm/prompts";
import { runGate1 } from "./gate1_mechanical";
import { runGate2 } from "./gate2_consistency";
import { runGate3 } from "./gate3_judge";
import { computeDifficulty, selectQuestions } from "./select";
import type { AssignmentMode, Question } from "@/types";

// ---------------------------------------------------------------------------
// 型別の重み付け（出質モード連動。ver2.md §9.5：モードは型の重み付けに連動）
// ---------------------------------------------------------------------------

const MODE_WEIGHTS: Record<AssignmentMode, Record<number, number>> = {
  idea: { 1: 2, 2: 1, 3: 3, 4: 1, 5: 2 },
  logic: { 1: 2, 2: 1, 3: 2, 4: 1, 5: 3 },
  vocab: { 1: 1, 2: 3, 3: 1, 4: 3, 5: 1 },
};

/** 1 submission あたりの推定API呼び出し数（コスト防御 §12 の見積もり用） */
export const ESTIMATED_CALLS_PER_SUBMISSION = 8; // 生成 最大5 + solve 1 + match 1 + judge 1

/** 重みに比例して total 問を型1〜5へ配分（最大剰余法・全型をまたぐ） */
export function allocateByWeight(
  total: number,
  weights: Record<number, number>
): Record<number, number> {
  const weightSum = Object.values(weights).reduce((a, b) => a + b, 0);
  const exact = Object.entries(weights).map(([type, w]) => ({
    type: Number(type),
    exact: (total * w) / weightSum,
  }));
  const counts: Record<number, number> = {};
  let assigned = 0;
  for (const e of exact) {
    counts[e.type] = Math.floor(e.exact);
    assigned += counts[e.type];
  }
  exact
    .sort((a, b) => (b.exact % 1) - (a.exact % 1))
    .slice(0, total - assigned)
    .forEach((e) => {
      counts[e.type]++;
    });
  return counts;
}

// ---------------------------------------------------------------------------
// LLM出力のスキーマ（responseSchema と zod の対）
// ---------------------------------------------------------------------------

const GEMINI_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    questions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          anchor: {
            type: Type.OBJECT,
            properties: {
              sentence_index: { type: Type.INTEGER },
              quoted_span: { type: Type.STRING },
            },
            required: ["sentence_index", "quoted_span"],
          },
          question_text: { type: Type.STRING },
          model_answer: { type: Type.STRING },
          acceptable_conditions: { type: Type.STRING },
          typical_wrong: { type: Type.STRING },
          scoring_steps: { type: Type.STRING },
        },
        required: [
          "anchor",
          "question_text",
          "model_answer",
          "acceptable_conditions",
          "typical_wrong",
          "scoring_steps",
        ],
      },
    },
  },
  required: ["questions"],
};

const GeneratedQuestionSchema = z.object({
  anchor: z.object({
    sentence_index: z.number().int().min(1),
    quoted_span: z.string().min(1),
  }),
  question_text: z.string().min(1),
  model_answer: z.string().min(1),
  acceptable_conditions: z.string(),
  typical_wrong: z.string(),
  scoring_steps: z.string(),
});

const GeneratedBatchSchema = z.object({
  questions: z.array(GeneratedQuestionSchema),
});

// ---------------------------------------------------------------------------
// 進捗イベント（一括実行時にSSEでUIへ流す）
// ---------------------------------------------------------------------------

export const PIPELINE_STEPS = [
  "前処理",
  "候補生成",
  "Gate1 機械検証",
  "Gate2 自己整合性",
  "Gate3 LLM審査",
  "選抜",
] as const;

export interface PipelineProgressEvent {
  submission_id: string;
  student_label: string;
  step: (typeof PIPELINE_STEPS)[number];
  phase: "start" | "done" | "failed";
  detail?: string;
}

export type ProgressCallback = (event: PipelineProgressEvent) => void;

// ---------------------------------------------------------------------------
// パイプライン本体（処理単位＝submission 1件）
// ---------------------------------------------------------------------------

export interface PipelineReport {
  submission_id: string;
  student_label: string;
  ok: boolean;
  steps: { name: string; status: "done" | "failed" | "skipped"; detail: string }[];
  candidate_count: number;
  gate1_pass_count: number;
  gate2_pass_count: number;
  gate3_pass_count: number;
  selected_count: number;
  warnings: string[];
}

export async function runPipeline(
  submissionId: string,
  onProgress?: ProgressCallback
): Promise<PipelineReport> {
  const storage = await getStorage();
  const [submission] = await storage.list("submissions", {
    submission_id: submissionId,
  });
  if (!submission) throw new Error(`提出 ${submissionId} が見つかりません`);
  const [assignment] = await storage.list("assignments", {
    assignment_id: submission.assignment_id,
  });
  if (!assignment) throw new Error("対応する課題が見つかりません");

  const report: PipelineReport = {
    submission_id: submissionId,
    student_label: submission.student_label,
    ok: false,
    steps: [],
    candidate_count: 0,
    gate1_pass_count: 0,
    gate2_pass_count: 0,
    gate3_pass_count: 0,
    selected_count: 0,
    warnings: [],
  };

  const emit = (
    step: PipelineProgressEvent["step"],
    phase: PipelineProgressEvent["phase"],
    detail?: string
  ) =>
    onProgress?.({
      submission_id: submissionId,
      student_label: submission.student_label,
      step,
      phase,
      detail,
    });

  // 冪等性（§12）：再実行時は既存の未承認候補を rejected にして新規生成
  const existing = await storage.list("questions", {
    submission_id: submissionId,
  });
  for (const q of existing) {
    if (q.status !== "approved" && q.status !== "rejected") {
      await storage.update("questions", "question_id", q.question_id, {
        status: "rejected",
      });
    }
  }

  // --- 前処理 -------------------------------------------------------------
  emit("前処理", "start");
  const analysis = preprocess(submission.text);
  if (analysis.validation_errors.length > 0) {
    await storage.update("submissions", "submission_id", submissionId, {
      analysis,
    });
    const detail = analysis.validation_errors.join(" / ");
    report.steps.push({ name: "前処理", status: "failed", detail });
    report.warnings.push(...analysis.validation_errors);
    emit("前処理", "failed", detail);
    return report;
  }
  await storage.update("submissions", "submission_id", submissionId, {
    analysis,
    status: "analyzed",
  });
  const preprocessDetail = `${analysis.sentences.length}文・${analysis.word_count}語・アンカー${analysis.anchors.length}件・難単語${analysis.difficult_words.length}件`;
  report.steps.push({ name: "前処理", status: "done", detail: preprocessDetail });
  emit("前処理", "done", preprocessDetail);

  // --- 候補生成（必要出題数の3倍・型をまたいで配分） -----------------------
  emit("候補生成", "start");
  const totalCandidates = assignment.question_count * 3;
  const allocation = allocateByWeight(
    totalCandidates,
    MODE_WEIGHTS[assignment.mode]
  );

  const numberedText = textWithSentenceNumbers(analysis);
  const candidates: Question[] = [];
  const generationErrors: string[] = [];

  for (const [typeStr, count] of Object.entries(allocation)) {
    const type = Number(typeStr);
    if (count === 0) continue;

    const prompt = loadPrompt(`generate_type${type}`);
    const vars: Record<string, string> = {
      TEXT_WITH_SENTENCE_NUMBERS: numberedText,
      QUESTION_COUNT_INSTRUCTION: `## 生成数\n\nこの型の問いを **${count}問** 生成し、questions 配列として出力すること。各問いは互いに異なるアンカー（異なる文・異なる語）を標的にすること。`,
    };
    if (type === 1) {
      vars.ANCHORS = JSON.stringify(analysis.anchors, null, 2);
    }
    if (type === 2) {
      vars.DIFFICULT_WORDS = JSON.stringify(analysis.difficult_words, null, 2);
    }
    const rendered = renderPrompt(prompt.body, vars);

    // スキーマ不適合は1回だけ再生成（要件定義 §7.2）
    let batch: z.infer<typeof GeneratedBatchSchema> | null = null;
    for (let attempt = 0; attempt < 2 && !batch; attempt++) {
      try {
        const raw = await generateJson({
          model: MODELS.flash,
          prompt: rendered,
          responseSchema: GEMINI_RESPONSE_SCHEMA,
        });
        const parsed = GeneratedBatchSchema.safeParse(raw);
        if (parsed.success && parsed.data.questions.length > 0) {
          batch = parsed.data;
        } else if (attempt === 1) {
          generationErrors.push(`型${type}: スキーマ不適合（2回失敗）`);
        }
      } catch (err) {
        if (attempt === 1) {
          generationErrors.push(
            `型${type}: ${err instanceof Error ? err.message : String(err)}`
          );
        }
      }
    }
    if (!batch) continue;

    for (const g of batch.questions) {
      const question: Question = {
        question_id: `q_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`,
        submission_id: submissionId,
        type,
        anchor: g.anchor,
        question_text: g.question_text,
        model_answer: g.model_answer,
        acceptable_conditions: g.acceptable_conditions,
        typical_wrong: g.typical_wrong,
        scoring_steps: g.scoring_steps,
        difficulty_score: computeDifficulty({
          type,
          question_text: g.question_text,
          model_answer: g.model_answer,
        }),
        gate1: null,
        gate2: null,
        gate3: null,
        status: "candidate",
        prompt_version: prompt.version,
        model_id: MODELS.flash,
      };
      candidates.push(question);
    }
  }

  report.candidate_count = candidates.length;
  if (candidates.length === 0) {
    const detail =
      generationErrors.join(" / ") || "候補が1件も生成されませんでした";
    report.steps.push({ name: "候補生成", status: "failed", detail });
    report.warnings.push(...generationErrors);
    emit("候補生成", "failed", detail);
    return report;
  }
  const genDetail =
    `${candidates.length}候補（目標${totalCandidates}）` +
    (generationErrors.length > 0
      ? ` ／ 一部失敗: ${generationErrors.join(" / ")}`
      : "");
  report.steps.push({ name: "候補生成", status: "done", detail: genDetail });
  if (generationErrors.length > 0) report.warnings.push(...generationErrors);
  emit("候補生成", "done", genDetail);

  // --- Gate 1：機械検証 ----------------------------------------------------
  emit("Gate1 機械検証", "start");
  for (const candidate of candidates) {
    const others = candidates.filter(
      (c) => c.question_id !== candidate.question_id
    );
    const gate1 = runGate1(
      candidate,
      others,
      analysis.sentences,
      submission.text
    );
    candidate.gate1 = gate1;
    if (!gate1.pass) candidate.status = "rejected";
  }
  const gate1Passed = candidates.filter((c) => c.gate1?.pass);
  report.gate1_pass_count = gate1Passed.length;
  const gate1Detail = `${gate1Passed.length}/${candidates.length} 通過`;
  report.steps.push({ name: "Gate1 機械検証", status: "done", detail: gate1Detail });
  emit("Gate1 機械検証", "done", gate1Detail);

  // --- Gate 2：自己整合性検証（LLM・一括） ---------------------------------
  emit("Gate2 自己整合性", "start");
  let gate2Pool = gate1Passed;
  try {
    const gate2Results = await runGate2(gate1Passed, numberedText);
    for (const candidate of gate1Passed) {
      const result = gate2Results.get(candidate.question_id);
      if (!result) continue;
      candidate.gate2 = result;
      if (!result.pass) candidate.status = "rejected";
    }
    gate2Pool = gate1Passed.filter((c) => c.gate2?.pass);
    report.gate2_pass_count = gate2Pool.length;
    const detail = `${gate2Pool.length}/${gate1Passed.length} 通過`;
    report.steps.push({ name: "Gate2 自己整合性", status: "done", detail });
    emit("Gate2 自己整合性", "done", detail);
  } catch (err) {
    // 検証自体の失敗は「スキップ記録」して続行（§11 Phase2 受け入れ条件）
    const detail = `検証呼び出しに失敗したためスキップ: ${err instanceof Error ? err.message : String(err)}`;
    report.steps.push({ name: "Gate2 自己整合性", status: "skipped", detail });
    report.warnings.push(`Gate2 ${detail}`);
    report.gate2_pass_count = gate1Passed.length;
    emit("Gate2 自己整合性", "failed", detail);
  }

  // --- Gate 3：LLM審査（一括） ----------------------------------------------
  emit("Gate3 LLM審査", "start");
  let finalPool = gate2Pool;
  try {
    const gate3Results = await runGate3(gate2Pool, numberedText);
    for (const candidate of gate2Pool) {
      const result = gate3Results.get(candidate.question_id);
      if (!result) continue;
      candidate.gate3 = result;
      if (!result.pass) candidate.status = "rejected";
    }
    finalPool = gate2Pool.filter((c) => c.gate3?.pass);
    report.gate3_pass_count = finalPool.length;
    const detail = `${finalPool.length}/${gate2Pool.length} 通過`;
    report.steps.push({ name: "Gate3 LLM審査", status: "done", detail });
    emit("Gate3 LLM審査", "done", detail);
  } catch (err) {
    const detail = `審査呼び出しに失敗したためスキップ: ${err instanceof Error ? err.message : String(err)}`;
    report.steps.push({ name: "Gate3 LLM審査", status: "skipped", detail });
    report.warnings.push(`Gate3 ${detail}`);
    report.gate3_pass_count = gate2Pool.length;
    emit("Gate3 LLM審査", "failed", detail);
  }

  // --- 選抜 -----------------------------------------------------------------
  emit("選抜", "start");
  const { selected, warnings } = selectQuestions(
    finalPool,
    assignment.question_count
  );
  for (const q of selected) q.status = "selected";
  report.selected_count = selected.length;
  report.warnings.push(...warnings);
  const selectDetail = `${selected.length}/${assignment.question_count}問を選抜`;
  report.steps.push({
    name: "選抜",
    status: selected.length > 0 ? "done" : "failed",
    detail: selectDetail,
  });

  // 全候補を保存（不合格も含む＝トレーサビリティ。要件定義 §5）
  await storage.insert("questions", candidates);
  await storage.update("submissions", "submission_id", submissionId, {
    status: "generated",
  });

  report.ok = selected.length > 0;
  emit("選抜", selected.length > 0 ? "done" : "failed", selectDetail);
  return report;
}
