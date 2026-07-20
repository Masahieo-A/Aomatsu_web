import type { ParsedBlock } from "@/types";
import { tryParseAssistantJsonToBlocks } from "@/lib/assistantResponseSchema";
import { LENSES } from "@/lib/inquiryConstants";

export type { ParsedBlock } from "@/types";

type ListItem = { label: string; sendValue: string; tooltip?: string };

function sanitizeModelText(text: string) {
  // UI設計上「*」はAI生成っぽさが強く、強調や箇条書きが崩れる原因にもなるため削除する。
  // 置換もしない（「・・」などのノイズを作らない）。
  return text.replace(/\*/g, "");
}

function splitLines(text: string) {
  return text.replace(/\r\n/g, "\n").split("\n");
}

function stripExamples(label: string) {
  // 「福祉（例：…）」→「福祉」
  const t = label.trim();
  const cut =
    t.split("（")[0]?.trim() ||
    t.split("(")[0]?.trim() ||
    t;
  return cut.replace(/^[・●■\-\s]+/, "").trim();
}

function normalizeLens(label: string) {
  // 「心理学のレンズ」→「心理学」
  const t = stripExamples(label);
  return t.replace(/のレンズ$/, "").trim();
}

function isOptionLine(line: string) {
  return (
    /^\s*(?:\d+[\.\)]|[・●■-])\s+/.test(line) ||
    /^\s*\(\d+\)\s+/.test(line)
  );
}

function parseListItems(lines: string[]): ListItem[] {
  const items: ListItem[] = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const m =
      line.match(/^(?:\d+[\.\)]|\(\d+\)|[・●■-])\s+(.*)$/) ??
      line.match(/^(.*)$/);
    const rawLabel = (m?.[1] ?? line).trim();
    const label = stripExamples(rawLabel);
    if (!label) continue;
    const tooltip = rawLabel !== label ? rawLabel : undefined;
    // クリック送信は「番号」ではなく内容（ラベル本文）を送る。
    items.push({ label, sendValue: label, tooltip });
  }
  return items;
}

function extractOptionBlock(text: string): { title?: string; options: ListItem[] } | null {
  const lines = splitLines(text);
  // 「最初のリスト」ではなく、最も“選択肢らしい”リストブロックを選ぶ。
  // 例：前段の説明用箇条書き（できること）を誤って拾わないため。
  const blocks: Array<{ start: number; end: number }> = [];

  for (let i = 0; i < lines.length; i++) {
    if (!isOptionLine(lines[i])) continue;
    const start = i;
    let end = i;
    for (let j = i + 1; j < lines.length; j++) {
      if (!lines[j].trim()) continue;
      if (!isOptionLine(lines[j])) break;
      end = j;
    }
    blocks.push({ start, end });
    i = end;
  }

  if (blocks.length === 0) return null;

  function score(parsed: ListItem[]) {
    const options = parsed.filter((o) => {
      const t = o.label.trim();
      if (!t) return false;
      if (t.length > 18) return false;
      if (t.includes("：") || t.includes(":")) return false;
      if (t.startsWith("（例") || t.startsWith("(例")) return false;
      return true;
    });
    const totalLen = options.reduce((acc, o) => acc + o.label.length, 0);
    return { options, count: options.length, totalLen };
  }

  let best:
    | { start: number; options: ListItem[]; count: number; totalLen: number }
    | null = null;

  for (const b of blocks) {
    const parsed = parseListItems(lines.slice(b.start, b.end + 1));
    const s = score(parsed);
    if (s.count < 3) continue;
    if (!best) {
      best = { start: b.start, options: s.options, count: s.count, totalLen: s.totalLen };
      continue;
    }
    // 優先順位：選択肢数が多い > 文字総量が少ない
    if (s.count > best.count || (s.count === best.count && s.totalLen < best.totalLen)) {
      best = { start: b.start, options: s.options, count: s.count, totalLen: s.totalLen };
    }
  }

  if (!best) return null;
  const title = lines.slice(0, best.start).join("\n").trim() || undefined;
  return { title, options: best.options };
}

function extractStepsBlock(text: string): { title?: string; steps: Array<{ title: string; body?: string }> } | null {
  const lines = splitLines(text);
  const stepIdxs = lines
    .map((l, i) => ({ l, i }))
    .filter(({ l }) => /^\s*(?:STEP\s*\d+|ステップ\s*\d+|\d+\s*\/\s*\d+)\b/i.test(l))
    .map(({ i }) => i);
  if (stepIdxs.length < 2) return null;

  const steps: Array<{ title: string; body?: string }> = [];
  for (let s = 0; s < stepIdxs.length; s++) {
    const start = stepIdxs[s];
    const end = (stepIdxs[s + 1] ?? lines.length) - 1;
    const title = lines[start].trim();
    const body = lines.slice(start + 1, end + 1).join("\n").trim() || undefined;
    steps.push({ title, body });
  }
  const title = lines.slice(0, stepIdxs[0]).join("\n").trim() || undefined;
  return { title, steps };
}

function extractThemesBlock(text: string): { title?: string; themes: Array<{ title: string; body?: string }> } | null {
  // 「候補」「テーマ」などの見出し＋複数アイテムがあるパターンを拾う（軽いヒューリスティック）
  if (!/(候補|テーマ)\b/.test(text)) return null;
  const lines = splitLines(text);

  const itemIdxs = lines
    .map((l, i) => ({ l, i }))
    .filter(({ l }) => /^\s*(?:\d+[\.\)]|[・●■-])\s+/.test(l))
    .map(({ i }) => i);
  if (itemIdxs.length < 2) return null;

  const themes: Array<{ title: string; body?: string }> = [];

  // 連続領域をテーマとして分割
  const starts = itemIdxs.filter((i, k) => k === 0 || i - itemIdxs[k - 1] > 1);
  const start = starts[0];
  for (let s = 0; s < starts.length; s++) {
    const st = starts[s];
    const en = (starts[s + 1] ?? lines.length) - 1;
    const head = lines[st].trim();
    const m = head.match(/^(?:\d+[\.\)]|[・●■-])\s+(.*)$/);
    const t = (m?.[1] ?? head).trim();
    const body = lines.slice(st + 1, en + 1).join("\n").trim() || undefined;
    if (t) themes.push({ title: t, body });
  }
  if (themes.length < 2) return null;
  const title = lines.slice(0, start).join("\n").trim() || undefined;
  return { title, themes };
}

function extractFourPerspectiveSections(text: string): {
  title?: string;
  sections: Array<{
    title: string;
    displayTitle: string;
    items: Array<{ label: string; sendValue: string; tooltip: string }>;
    tone: "green" | "blue" | "amber" | "slate";
  }>;
} | null {
  const lines = splitLines(text);
  const heads = ["原因・起源", "関係者", "影響・結果", "解決策・対応"] as const;

  function pickInlineAfterHead(raw: string, head: (typeof heads)[number]) {
    const t = raw.trim();
    const delims = ["：", ":"] as const;
    for (const d of delims) {
      const prefix = `${head}${d}`;
      if (t.startsWith(prefix)) {
        const rest = t.slice(prefix.length).trim();
        return rest || null;
      }
    }
    return null;
  }

  const headIdxs = lines
    .map((l, i) => ({ l: l.trim(), i }))
    .filter(({ l }) => heads.some((h) => l === h || l.startsWith(`${h}：`) || l.startsWith(`${h}:`)))
    .map(({ i }) => i);
  if (headIdxs.length < 3) return null;

  const toneByTitle: Record<(typeof heads)[number], "green" | "blue" | "amber" | "slate"> = {
    "原因・起源": "amber",
    関係者: "blue",
    "影響・結果": "slate",
    "解決策・対応": "green"
  };

  const title = lines.slice(0, headIdxs[0]).join("\n").trim() || undefined;
  const displayTitleByTitle: Record<(typeof heads)[number], string> = {
    "原因・起源": "原因・背景",
    関係者: "社会との関わり",
    "影響・結果": "どんな影響？",
    "解決策・対応": "どう変える？"
  };

  const tooltipPrefixByTitle: Record<(typeof heads)[number], string> = {
    "原因・起源": "背景やきっかけを探す視点だよ。",
    関係者: "関わる人・組織・立場を整理する視点だよ。",
    "影響・結果": "何が起きているか、困りごとや変化を見る視点だよ。",
    "解決策・対応": "どうすれば良くなるか、工夫や仕組みを考える視点だよ。"
  };

  const sections: Array<{
    title: string;
    displayTitle: string;
    items: Array<{ label: string; sendValue: string; tooltip: string }>;
    tone: "green" | "blue" | "amber" | "slate";
  }> = [];

  for (let s = 0; s < headIdxs.length; s++) {
    const start = headIdxs[s];
    const end = (headIdxs[s + 1] ?? lines.length) - 1;
    const rawHead = lines[start].trim();
    const head = heads.find((h) => rawHead === h || rawHead.startsWith(`${h}：`) || rawHead.startsWith(`${h}:`));
    if (!head) continue;

    const inline = pickInlineAfterHead(rawHead, head);
    const bodyLines = lines
      .slice(start + 1, end + 1)
      .map((x) => x.trim())
      .filter(Boolean)
      .filter((x) => !/^[-・●■]\s*$/.test(x));
    const merged = [inline, ...bodyLines].filter(Boolean) as string[];
    if (merged.length === 0) continue;

    const items = merged.map((label) => ({
      label,
      sendValue: label,
      tooltip: `${tooltipPrefixByTitle[head]}\n\nこのカードの内容：${label}`
    }));

    sections.push({
      title: head,
      displayTitle: displayTitleByTitle[head],
      items,
      tone: toneByTitle[head]
    });
  }

  if (sections.length < 3) return null;
  return { title, sections };
}

export function parseGeminiResponse(text: string): ParsedBlock[] {
  const trimmedRaw = text.trim();
  if (!trimmedRaw) return [];

  const structured = tryParseAssistantJsonToBlocks(trimmedRaw);
  if (structured && structured.length > 0) {
    const hasInteractive = structured.some(
      (b) => b.type === "options" || b.type === "lensPicker" || b.type === "sections"
    );
    if (hasInteractive) return structured;

    // JSONが「markdownしか返さない」等で選択肢が埋もれた場合は、
    // markdown本文からヒューリスティックでインタラクティブブロックを復元する。
    const markdownText = structured
      .filter((b) => b.type === "markdown")
      .map((b) => b.content)
      .join("\n\n")
      .trim();

    if (markdownText) {
      const recovered = parseHeuristicBlocks(markdownText);
      const recoveredHasInteractive = recovered.some(
        (b) => b.type === "options" || b.type === "lensPicker" || b.type === "sections"
      );
      if (recoveredHasInteractive) return recovered;
    }

    return structured;
  }

  return parseHeuristicBlocks(text);
}

function parseHeuristicBlocks(text: string): ParsedBlock[] {
  const trimmed = sanitizeModelText(text).trim();
  if (!trimmed) return [];

  // 1) 選択肢（最優先）
  const opt = extractOptionBlock(trimmed);
  if (opt) {
    const normalizedLenses = opt.options
      .map((o) => ({ ...o, label: normalizeLens(o.label), sendValue: normalizeLens(o.sendValue) }))
      .filter((o) => (LENSES as readonly string[]).includes(o.label));

    // レンズ選択と判定できる場合は、カードではなく専用UIに分離
    if (normalizedLenses.length >= 5) {
      return [{ type: "lensPicker", title: opt.title, lenses: normalizedLenses }];
    }

    return [{ type: "options", title: opt.title, options: opt.options }];
  }

  // 2) STEP1の4視点（原因/関係者/影響/対応）をカード分割
  const four = extractFourPerspectiveSections(trimmed);
  if (four) {
    return [{ type: "sections", title: four.title, sections: four.sections }];
  }

  // 3) ステップ
  const steps = extractStepsBlock(trimmed);
  if (steps) {
    return [{ type: "steps", title: steps.title, steps: steps.steps }];
  }

  // 4) テーマ候補
  const themes = extractThemesBlock(trimmed);
  if (themes) {
    return [{ type: "themes", title: themes.title, themes: themes.themes }];
  }

  // 5) 最終手段: Markdown
  return [{ type: "markdown", content: trimmed }];
}

