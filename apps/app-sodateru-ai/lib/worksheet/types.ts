/** グループ準備プリント作成機能の型定義（要件: docs/要件定義_グループ準備プリント.md） */

export type WorksheetChoice = { label: string; text: string };

/** 教員専用 API が返す、1単元分の材料（practice 問題のみ） */
export type WorksheetKnowledge = {
  id: string;
  label: string;
  description: string;
  decisionCriteria: string;
  commonMisconceptions: string[];
};

export type WorksheetPracticeQuestion = {
  id: string;
  knowledgeIds: string[];
  prompt: string;
  choices: WorksheetChoice[];
  answer: string;
  explanation: string;
  misconception: { choiceLabel: string; description: string } | null;
  difficulty: string;
};

export type WorksheetSource = {
  unitId: string;
  unitCode: string;
  unitTitle: string;
  summary: string;
  knowledge: WorksheetKnowledge[];
  practice: WorksheetPracticeQuestion[];
  /** 取り込み時に混入を拒否するための ID だけ（問題本文は返さない） */
  assessmentQuestionIds: string[];
};

export type WorksheetLevel = "basic" | "standard";

export type WorksheetExportOptions = {
  selectedKnowledgeIds: string[];
  questionCount: number;
  level: WorksheetLevel;
};

/** サブスクAIから取り込むプリント本体 */
export type WorksheetCheckQuestion = {
  no: number;
  knowledgeId: string;
  sourceQuestionId: string | null;
  source: "bank" | "new";
  prompt: string;
  choices: WorksheetChoice[];
  answer: string;
  reasonPrompt: string;
  explanation: string;
};

export type WorksheetRuleQuestion = {
  knowledgeId: string;
  question: string;
  hint: string;
  modelAnswer: string;
};

export type WorksheetFixSouta = {
  knowledgeId: string;
  soutaSays: string;
  modelAnswer: string;
};

export type WorksheetExampleTask = {
  knowledgeId: string;
  instruction: string;
};

export type Worksheet = {
  format: "sodateru-worksheet";
  version: 1;
  unitId: string;
  title: string;
  goal: string;
  checkQuestions: WorksheetCheckQuestion[];
  ruleQuestions: WorksheetRuleQuestion[];
  fixSouta: WorksheetFixSouta[];
  exampleTasks: WorksheetExampleTask[];
  teachingPlan: { keywords: string[]; orderHint: string };
};

export type WorksheetParseResult = {
  worksheet: Worksheet | null;
  errors: string[];
  warnings: string[];
};
