export type ClozeTest = {
  id: number;
  lesson: string;
  part: string;
  title?: string | null;
  display_order: number;
  body: string; // full sentence; blanks are generated dynamically at render time
  trans?: string | null;
};

export type SentenceRearrangement = {
  id: number;
  lesson: string;
  part: string;
  title?: string | null;
  seq: number;
  sentence: string; // space-separated words, period is separate token
  trans?: string | null;
};
