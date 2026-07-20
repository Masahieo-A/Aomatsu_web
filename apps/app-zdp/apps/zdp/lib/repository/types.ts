/** データアクセス層の共有型（要件 §5 のシート定義に対応） */

export interface LearnerRow {
  learner_id: string;
  display_name: string;
  current_level: string;
  created_at: string;
}

export interface SessionRow {
  session_id: string;
  learner_id: string;
  input_sentence: string;
  sentence_hash: string;
  identified_items: string; // カンマ区切り
  root_cause: string;
  started_at: string;
  ended_at: string;
}

export interface ResponseRow {
  response_id: string;
  session_id: string;
  probe_type: "vocab" | "structure" | "similar" | "production";
  item_id: string;
  question: string;
  answer: string;
  is_correct: boolean;
  confidence: number;
  quadrant: Quadrant;
  answered_at: string;
}

export type Quadrant =
  | "mastered"
  | "zpd"
  | "error_candidate"
  | "mistake_candidate";

export interface WeaknessRow {
  learner_id: string;
  item_id: string;
  status: "error" | "improving" | "mastered";
  error_count: number;
  last_seen: string;
}

export interface CacheRow {
  sentence_hash: string;
  sentence: string;
  analysis_json: string;
  verified: boolean;
  hit_count: number;
}

export interface ApiLogRow {
  date: string;
  call_type: string;
  prompt_version: string;
  token_in: number;
  token_out: number;
  cached: boolean;
}

/**
 * データアクセス抽象（Repository パターン）。
 * 将来 Supabase 等へ移行する場合はこのインターフェースを実装するだけでよい。
 */
export interface Repository {
  ensureLearner(learner: LearnerRow): Promise<void>;
  appendSession(row: SessionRow): Promise<void>;
  appendResponse(row: ResponseRow): Promise<void>;
  upsertWeakness(row: WeaknessRow): Promise<void>;

  getCache(hash: string): Promise<CacheRow | null>;
  putCache(row: CacheRow): Promise<void>;

  appendApiLog(row: ApiLogRow): Promise<void>;
}
