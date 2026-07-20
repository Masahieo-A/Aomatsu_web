import { SchemaType, type Schema } from "@google/generative-ai";

/** 交差点まとめ画面用の structured output */
export const INTERSECTION_SUMMARY_SCHEMA: Schema = {
  type: SchemaType.OBJECT,
  description: "会話ログからX軸・Y軸を整理し、交差点の問い例を3つ出す",
  properties: {
    xAxis: {
      type: SchemaType.OBJECT,
      properties: {
        genre: {
          type: SchemaType.STRING,
          description: "9分野のうちユーザーが選んだ分野名（福祉、健康、…）"
        },
        focusSummary: {
          type: SchemaType.STRING,
          description:
            "その後の対話でユーザーが向き合っているテーマ・疑問の要約（1〜3文、高校生向けのやさしい日本語）"
        }
      },
      required: ["genre", "focusSummary"]
    },
    yAxis: {
      type: SchemaType.OBJECT,
      properties: {
        lens: {
          type: SchemaType.STRING,
          description: "ユーザーが最後に選んだ副次的レンズ名（7つのいずれか）"
        }
      },
      required: ["lens"]
    },
    exampleQuestions: {
      type: SchemaType.ARRAY,
      description: "XとYの交差点から生じうる探究問いの具体例をちょうど3つ",
      items: { type: SchemaType.STRING },
      minItems: 3,
      maxItems: 3
    }
  },
  required: ["xAxis", "yAxis", "exampleQuestions"]
};

export type IntersectionSummaryPayload = {
  xAxis: { genre: string; focusSummary: string };
  yAxis: { lens: string };
  exampleQuestions: [string, string, string];
};

export const INTERSECTION_CLOSING_COMMENT =
  "私がサポートできるのはここまでです。上で提案した問いを探究テーマにしても良いし、自分独自のものを考えても構いません。良い探求になるとよいですね！";
