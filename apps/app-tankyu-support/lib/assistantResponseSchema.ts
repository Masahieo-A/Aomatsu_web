import { SchemaType, type Schema } from "@google/generative-ai";
import type { ParsedBlock } from "@/types";

/** API（responseSchema）とアプリ（ParsedBlock）で共有するバージョン */
export const ASSISTANT_ENVELOPE_VERSION = 1;

/**
 * Gemini `generationConfig.responseSchema` 用。
 * 1応答 = 1JSONオブジェクト。ブロックは kind で区別し、該当フィールドのみ埋める。
 */
export const GEMINI_ASSISTANT_RESPONSE_SCHEMA: Schema = {
  type: SchemaType.OBJECT,
  description:
    "探究ファシリテーターAIの1ターン分の応答。versionは1固定。blocksの順に画面に表示する。",
  properties: {
    version: {
      type: SchemaType.INTEGER,
      description: "常に1"
    },
    blocks: {
      type: SchemaType.ARRAY,
      description: "表示ブロックの並び。説明文・表・選択肢はそれぞれ適切なkindのブロックに分ける。",
      items: {
        type: SchemaType.OBJECT,
        properties: {
          kind: {
            type: SchemaType.STRING,
            format: "enum",
            enum: ["markdown", "options", "lensPicker", "sections", "steps", "themes"],
            description:
              "markdown=本文(Markdown可) / options=番号なしタップ選択 / lensPicker=7レンズ / sections=4視点カード / steps / themes"
          },
          title: {
            type: SchemaType.STRING,
            nullable: true,
            description: "ブロック直上の見出し（任意）"
          },
          content: {
            type: SchemaType.STRING,
            nullable: true,
            description: "kind=markdownのとき必須。Markdown表を含む長文もここに書く。"
          },
          options: {
            type: SchemaType.ARRAY,
            nullable: true,
            description: "kind=options。タップで送信する選択肢。",
            items: {
              type: SchemaType.OBJECT,
              properties: {
                label: { type: SchemaType.STRING, description: "短い表示名" },
                sendValue: { type: SchemaType.STRING, description: "送信する値（通常はlabelと同じでよい）" },
                tooltip: { type: SchemaType.STRING, nullable: true, description: "補足説明（任意）" }
              },
              required: ["label", "sendValue"]
            }
          },
          lenses: {
            type: SchemaType.ARRAY,
            nullable: true,
            description: "kind=lensPicker。7レンズの行。",
            items: {
              type: SchemaType.OBJECT,
              properties: {
                label: { type: SchemaType.STRING },
                sendValue: { type: SchemaType.STRING },
                tooltip: { type: SchemaType.STRING, nullable: true }
              },
              required: ["label", "sendValue"]
            }
          },
          sections: {
            type: SchemaType.ARRAY,
            nullable: true,
            description: "kind=sections。4視点などのセクション。",
            items: {
              type: SchemaType.OBJECT,
              properties: {
                title: { type: SchemaType.STRING, description: "原因・起源 など" },
                displayTitle: { type: SchemaType.STRING, nullable: true },
                tone: {
                  type: SchemaType.STRING,
                  format: "enum",
                  enum: ["green", "blue", "amber", "slate"],
                  nullable: true
                },
                items: {
                  type: SchemaType.ARRAY,
                  items: {
                    type: SchemaType.OBJECT,
                    properties: {
                      label: { type: SchemaType.STRING },
                      sendValue: { type: SchemaType.STRING },
                      tooltip: { type: SchemaType.STRING, nullable: true }
                    },
                    required: ["label", "sendValue"]
                  }
                }
              },
              required: ["title", "items"]
            }
          },
          steps: {
            type: SchemaType.ARRAY,
            nullable: true,
            description: "kind=steps",
            items: {
              type: SchemaType.OBJECT,
              properties: {
                title: { type: SchemaType.STRING },
                body: { type: SchemaType.STRING, nullable: true }
              },
              required: ["title"]
            }
          },
          themes: {
            type: SchemaType.ARRAY,
            nullable: true,
            description: "kind=themes",
            items: {
              type: SchemaType.OBJECT,
              properties: {
                title: { type: SchemaType.STRING },
                body: { type: SchemaType.STRING, nullable: true }
              },
              required: ["title"]
            }
          }
        },
        required: ["kind"]
      }
    }
  },
  required: ["version", "blocks"]
};

const SECTION_TOOLTIP: Record<string, string> = {
  "原因・起源": "背景やきっかけを探す視点だよ。",
  関係者: "関わる人・組織・立場を整理する視点だよ。",
  "影響・結果": "何が起きているか、困りごとや変化を見る視点だよ。",
  "解決策・対応": "どうすれば良くなるか、工夫や仕組みを考える視点だよ。"
};

const SECTION_DISPLAY: Record<string, string> = {
  "原因・起源": "原因・背景",
  関係者: "社会との関わり",
  "影響・結果": "どんな影響？",
  "解決策・対応": "どう変える？"
};

const DEFAULT_TONE_BY_TITLE: Record<string, "green" | "blue" | "amber" | "slate"> = {
  "原因・起源": "amber",
  関係者: "blue",
  "影響・結果": "slate",
  "解決策・対応": "green"
};

function sanitizeStar(s: string) {
  return s.replace(/\*/g, "");
}

function mapSectionItem(title: string, label: string, sendValue: string, tooltip?: string | null) {
  const t = tooltip?.trim();
  const tip =
    t && t.length > 0
      ? sanitizeStar(t)
      : `${SECTION_TOOLTIP[title] ?? "この視点だよ。"}\n\nこのカードの内容：${sanitizeStar(label)}`;
  return {
    label: sanitizeStar(label),
    sendValue: sanitizeStar(sendValue),
    tooltip: tip
  };
}

/**
 * Gemini が返した JSON 文字列を ParsedBlock[] に変換する。不正なら null（呼び出し側でヒューリスティックへフォールバック）。
 */
export function tryParseAssistantJsonToBlocks(raw: string): ParsedBlock[] | null {
  let data: unknown;
  try {
    data = JSON.parse(raw.trim());
  } catch {
    return null;
  }

  if (!data || typeof data !== "object") return null;
  const env = data as { version?: unknown; blocks?: unknown };
  if (env.version !== ASSISTANT_ENVELOPE_VERSION) return null;
  if (!Array.isArray(env.blocks) || env.blocks.length === 0) return null;

  const out: ParsedBlock[] = [];

  for (const b of env.blocks) {
    if (!b || typeof b !== "object") return null;
    const block = b as {
      kind?: unknown;
      title?: unknown;
      content?: unknown;
      options?: unknown;
      lenses?: unknown;
      sections?: unknown;
      steps?: unknown;
      themes?: unknown;
    };

    const kind = block.kind;
    if (typeof kind !== "string") return null;

    const title =
      block.title === null || block.title === undefined
        ? undefined
        : typeof block.title === "string"
          ? sanitizeStar(block.title)
          : null;
    if (title === null) return null;

    switch (kind) {
      case "markdown": {
        if (typeof block.content !== "string" || !block.content.trim()) return null;
        out.push({ type: "markdown", content: sanitizeStar(block.content) });
        break;
      }
      case "options": {
        if (!Array.isArray(block.options) || block.options.length === 0) return null;
        const options: Array<{ label: string; sendValue: string; tooltip?: string }> = [];
        for (const o of block.options) {
          if (!o || typeof o !== "object") return null;
          const x = o as { label?: unknown; sendValue?: unknown; tooltip?: unknown };
          if (typeof x.label !== "string" || typeof x.sendValue !== "string") return null;
          const tooltip =
            x.tooltip === null || x.tooltip === undefined
              ? undefined
              : typeof x.tooltip === "string"
                ? sanitizeStar(x.tooltip)
                : null;
          if (tooltip === null) return null;
          options.push({
            label: sanitizeStar(x.label),
            sendValue: sanitizeStar(x.sendValue),
            tooltip
          });
        }
        out.push({ type: "options", title, options });
        break;
      }
      case "lensPicker": {
        if (!Array.isArray(block.lenses) || block.lenses.length === 0) return null;
        const lenses: Array<{ label: string; sendValue: string; tooltip?: string }> = [];
        for (const o of block.lenses) {
          if (!o || typeof o !== "object") return null;
          const x = o as { label?: unknown; sendValue?: unknown; tooltip?: unknown };
          if (typeof x.label !== "string" || typeof x.sendValue !== "string") return null;
          const tooltip =
            x.tooltip === null || x.tooltip === undefined
              ? undefined
              : typeof x.tooltip === "string"
                ? sanitizeStar(x.tooltip)
                : null;
          if (tooltip === null) return null;
          lenses.push({
            label: sanitizeStar(x.label),
            sendValue: sanitizeStar(x.sendValue),
            tooltip
          });
        }
        out.push({ type: "lensPicker", title, lenses });
        break;
      }
      case "sections": {
        if (!Array.isArray(block.sections) || block.sections.length === 0) return null;
        const built: Array<{
          title: string;
          displayTitle?: string;
          items: Array<{ label: string; sendValue: string; tooltip: string }>;
          tone?: "green" | "blue" | "amber" | "slate";
        }> = [];

        for (const s of block.sections) {
          if (!s || typeof s !== "object") return null;
          const sec = s as {
            title?: unknown;
            displayTitle?: unknown;
            tone?: unknown;
            items?: unknown;
          };
          if (typeof sec.title !== "string") return null;
          if (!Array.isArray(sec.items) || sec.items.length === 0) return null;

          const displayTitleRaw =
            sec.displayTitle === null || sec.displayTitle === undefined
              ? SECTION_DISPLAY[sec.title] ?? sanitizeStar(sec.title)
              : typeof sec.displayTitle === "string"
                ? sanitizeStar(sec.displayTitle)
                : null;
          if (displayTitleRaw === null) return null;

          let tone: "green" | "blue" | "amber" | "slate" | undefined;
          if (sec.tone === undefined || sec.tone === null) {
            tone = DEFAULT_TONE_BY_TITLE[sec.title];
          } else if (
            sec.tone === "green" ||
            sec.tone === "blue" ||
            sec.tone === "amber" ||
            sec.tone === "slate"
          ) {
            tone = sec.tone;
          } else {
            return null;
          }

          const items: Array<{ label: string; sendValue: string; tooltip: string }> = [];
          for (const it of sec.items) {
            if (!it || typeof it !== "object") return null;
            const row = it as { label?: unknown; sendValue?: unknown; tooltip?: unknown };
            if (typeof row.label !== "string" || typeof row.sendValue !== "string") return null;
            const tooltip =
              row.tooltip === null || row.tooltip === undefined
                ? undefined
                : typeof row.tooltip === "string"
                  ? sanitizeStar(row.tooltip)
                  : null;
            if (tooltip === null) return null;
            const mapped = mapSectionItem(sec.title, row.label, row.sendValue, tooltip);
            items.push(mapped);
          }

          built.push({
            title: sanitizeStar(sec.title),
            displayTitle: displayTitleRaw,
            items,
            tone
          });
        }

        out.push({ type: "sections", title, sections: built });
        break;
      }
      case "steps": {
        if (!Array.isArray(block.steps) || block.steps.length === 0) return null;
        const steps: Array<{ title: string; body?: string }> = [];
        for (const st of block.steps) {
          if (!st || typeof st !== "object") return null;
          const x = st as { title?: unknown; body?: unknown };
          if (typeof x.title !== "string") return null;
          const body =
            x.body === null || x.body === undefined
              ? undefined
              : typeof x.body === "string"
                ? sanitizeStar(x.body)
                : null;
          if (body === null) return null;
          steps.push({ title: sanitizeStar(x.title), body });
        }
        out.push({ type: "steps", title, steps });
        break;
      }
      case "themes": {
        if (!Array.isArray(block.themes) || block.themes.length === 0) return null;
        const themes: Array<{ title: string; body?: string }> = [];
        for (const th of block.themes) {
          if (!th || typeof th !== "object") return null;
          const x = th as { title?: unknown; body?: unknown };
          if (typeof x.title !== "string") return null;
          const body =
            x.body === null || x.body === undefined
              ? undefined
              : typeof x.body === "string"
                ? sanitizeStar(x.body)
                : null;
          if (body === null) return null;
          themes.push({ title: sanitizeStar(x.title), body });
        }
        out.push({ type: "themes", title, themes });
        break;
      }
      default:
        return null;
    }
  }

  return out.length > 0 ? out : null;
}
