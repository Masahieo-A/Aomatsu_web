export type SentenceRearrangement = {
  id: number;
  grade: string;
  lesson: string;
  part: string;
  title?: string | null;
  seq: number;
  sentence: string;
  trans?: string | null;
};
