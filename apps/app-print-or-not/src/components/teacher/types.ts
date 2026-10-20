// 教員 API（/api/teacher/dashboard）の応答の形。サーバーとクライアントで共有する型だけを置く。
import type { ClassStats, Settings, Side } from "@/lib/types";

export interface DashCard {
  articleId: string;
  side: Side;
  point: string; // points.json の ID
  fact: string;
  soWhat: string;
  weakPoint: string;
  hasSoWhat: boolean;
}

export interface DashStudent {
  classId: string;
  number: number;
  stanceBefore: number | null;
  stanceAfter: number | null;
  cardCount: number;
  soWhatCount: number;
  cards: DashCard[];
}

export interface DashHint {
  articleId: string;
  level: "lv1" | "lv2";
  paragraph: number; // 0始まり
  count: number;
}

export interface DashboardData {
  classId: string | null; // null = 全クラス
  stats: ClassStats;
  cardCount: number;
  soWhatCount: number;
  cardStudents: number; // Card を1枚以上作った生徒数
  hintTop: DashHint[];
  students: DashStudent[]; // 全クラス表示のときは空（件数が多いため）
  settings: Settings;
}
