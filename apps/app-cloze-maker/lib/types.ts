export type ClozeTest = {
  id: number;
  grade: string;
  lesson: string;
  part: string;
  title?: string | null;
  display_order: number;
  body: string;
  trans?: string | null;
};
