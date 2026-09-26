import type {
  WorksheetExportOptions,
  WorksheetPracticeQuestion,
  WorksheetSource,
} from "./types";

export const REQUEST_HEADER = "#SODATERU_WORKSHEET_REQUEST";
export const REQUEST_VERSION = "v1";

/** TSV のセルに入れられるよう、タブ・改行を半角スペースにする */
export function tsvCell(value: unknown): string {
  return String(value ?? "").replace(/[\t\r\n]+/g, " ").trim();
}

function tsvRow(cells: unknown[]): string {
  return cells.map(tsvCell).join("\t");
}

/** 文字列から決定的なシードを作る（FNV-1a） */
function hashSeed(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function seededRandom(seed: number): () => number {
  let state = seed || 1;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: T[], random: () => number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * 選択した知識項目から practice 問題を選ぶ。
 * 項目ごとに偏らないよう順番に1問ずつ取り、最大 questionCount×2 問。
 * assessment 問題は source の時点で含まれないが、念のためここでも除外する。
 */
export function selectPracticeQuestions(
  source: WorksheetSource,
  options: WorksheetExportOptions,
): WorksheetPracticeQuestion[] {
  const selected = source.knowledge.map((item) => item.id).filter((id) => options.selectedKnowledgeIds.includes(id));
  if (selected.length === 0) return [];
  const assessment = new Set(source.assessmentQuestionIds);
  const random = seededRandom(hashSeed([source.unitId, ...selected, options.level].join("|")));
  const limit = Math.max(1, options.questionCount) * 2;

  const groups = selected.map((knowledgeId) => {
    const questions = source.practice.filter((q) => !assessment.has(q.id) && q.knowledgeIds[0] === knowledgeId);
    const shuffled = shuffle(questions, random);
    // 基礎寄り: intro を先に、challenge を最後に
    if (options.level === "basic") {
      const rank = (q: WorksheetPracticeQuestion) => (q.difficulty === "intro" ? 0 : q.difficulty === "challenge" ? 2 : 1);
      shuffled.sort((a, b) => rank(a) - rank(b));
    }
    return shuffled;
  });

  const picked: WorksheetPracticeQuestion[] = [];
  for (let round = 0; picked.length < limit; round++) {
    let added = false;
    for (const group of groups) {
      if (round < group.length && picked.length < limit) {
        picked.push(group[round]);
        added = true;
      }
    }
    if (!added) break;
  }
  return picked;
}

/** サブスクAIに貼る材料（TSV）を作る */
export function buildRequestTsv(source: WorksheetSource, options: WorksheetExportOptions): string {
  const knowledge = source.knowledge.filter((item) => options.selectedKnowledgeIds.includes(item.id));
  const practice = selectPracticeQuestions(source, options);
  const lines: string[] = [
    tsvRow([REQUEST_HEADER, REQUEST_VERSION]),
    tsvRow(["META", "unitId", source.unitId]),
    tsvRow(["META", "unitTitle", `${source.unitCode} ${source.unitTitle}`.trim()]),
    tsvRow(["META", "summary", source.summary]),
    tsvRow(["META", "questionCount", options.questionCount]),
    tsvRow(["META", "level", options.level]),
    tsvRow(["KNOWLEDGE", "id", "name", "description", "decisionCriteria", "commonMisconceptions"]),
    ...knowledge.map((item) => tsvRow([
      "KNOWLEDGE", item.id, item.label, item.description, item.decisionCriteria, item.commonMisconceptions.join("／"),
    ])),
    tsvRow(["PRACTICE", "id", "knowledgeId", "prompt", "A", "B", "C", "D", "correctLabel", "rationale", "misconceptions"]),
    ...practice.map((q) => {
      const choice = (label: string) => q.choices.find((c) => c.label === label)?.text ?? "";
      const misconception = q.misconception ? `${q.misconception.choiceLabel}: ${q.misconception.description}` : "";
      return tsvRow([
        "PRACTICE", q.id, q.knowledgeIds[0] ?? "", q.prompt,
        choice("A"), choice("B"), choice("C"), choice("D"),
        q.answer, q.explanation, misconception,
      ]);
    }),
    "#END",
  ];
  return lines.join("\n");
}
