/**
 * フォーム入力と Gemini 応答の Zod スキーマ（型安全な検証用）を定義する。
 */
import { z } from "zod";

// ==========================================
// 入力（フォーム）スキーマ
// ==========================================
export const InputSchema = z
  .object({
    topic: z
      .string()
      .min(1, "テーマを入力してください")
      .max(500, "テーマは500文字以内で入力してください"),
    wordCountReq: z
      .string()
      .max(20, "語数の指定が長すぎます")
      .regex(
        /^\d+(-\d+)?$/,
        "語数は '80' または '80-100' の形式で入力してください"
      ),
    essay: z
      .string()
      .min(1, "英文を入力してください")
      .max(6000, "英文が長すぎます。6000文字以内で入力してください"),
  })
  .superRefine((data, ctx) => {
    const parts = data.wordCountReq.split("-");
    if (parts.length === 2) {
      const lo = parseInt(parts[0] ?? "0", 10);
      const hi = parseInt(parts[1] ?? "0", 10);
      if (lo > hi) {
        ctx.addIssue({
          code: "custom",
          path: ["wordCountReq"],
          message: "語数範囲の下限は上限以下にしてください",
        });
      }
    }
  });

export type InputType = z.infer<typeof InputSchema>;

// ==========================================
// errorType の許容値（18種類）
// ==========================================
export const ErrorTypeEnum = z.enum([
  "スペルミス",
  "時制",
  "完了形",
  "仮定法",
  "主語と動詞の不一致",
  "動詞の種類",
  "語形",
  "助動詞",
  "受け身",
  "不定詞・動名詞",
  "分詞",
  "関係代名詞",
  "接続詞",
  "前置詞",
  "語順",
  "文構造",
  "大文字・小文字",
  "その他",
]);

export const ERROR_TYPE_VALUES = ErrorTypeEnum.options;

// ==========================================
// 修正（解答）情報スキーマ
//   type "blank"  : 一部を直せば解決する → 空欄補充で練習
//   type "rewrite": 文全体の書き直しが必要 → 全文書き直しで練習
// ==========================================
export const CorrectionSchema = z.object({
  type: z.enum(["blank", "rewrite"]),
  // blank: 空欄（_____）を含む文 / rewrite: 元の文をそのまま
  maskedSentence: z.string(),
  // blank: 空欄に入る正解候補 / rewrite: 空配列
  acceptableAnswers: z.array(z.string()),
  // 模範解答（全文）。「解答を見る」を押したときだけ表示
  correctedSentence: z.string(),
});

export type CorrectionType = z.infer<typeof CorrectionSchema>;

// ==========================================
// 出力（Gemini応答）スキーマ
// ==========================================
export const OutputSchema = z.object({
  wordCount: z.object({
    count: z.number().int().nonnegative(),
    satisfied: z.boolean(),
  }),
  positiveComment: z.string(),
  errors: z.array(
    z.object({
      sentence: z.string(),
      errorType: ErrorTypeEnum,
      specificTerm: z.string().nullable(),
      hints: z.object({
        level1: z.string(),
        level2: z.string(),
        level3: z.string(),
      }),
      // 後方互換のため optional。未指定でもヒントのみで動作する。
      correction: CorrectionSchema.optional(),
    })
  ),
});

export type OutputType = z.infer<typeof OutputSchema>;
