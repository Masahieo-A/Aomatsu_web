/**
 * ローカルファイル実装（Google認証情報が無い場合のフォールバック）。
 * 各「シート」を apps/zdp/.data/<name>.json に配列として保存する。
 * 書き込みは append ベースで、キャッシュのみ upsert。
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import type {
  ApiLogRow,
  CacheRow,
  LearnerRow,
  Repository,
  ResponseRow,
  SessionRow,
  WeaknessRow,
} from "./types";

const DATA_DIR = path.join(process.cwd(), ".data");

async function readTable<T>(name: string): Promise<T[]> {
  try {
    const raw = await fs.readFile(path.join(DATA_DIR, `${name}.json`), "utf8");
    return JSON.parse(raw) as T[];
  } catch {
    return [];
  }
}

async function writeTable<T>(name: string, rows: T[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(
    path.join(DATA_DIR, `${name}.json`),
    JSON.stringify(rows, null, 2),
    "utf8"
  );
}

async function append<T>(name: string, row: T): Promise<void> {
  const rows = await readTable<T>(name);
  rows.push(row);
  await writeTable(name, rows);
}

export class LocalRepository implements Repository {
  async ensureLearner(learner: LearnerRow): Promise<void> {
    const rows = await readTable<LearnerRow>("learners");
    if (!rows.some((r) => r.learner_id === learner.learner_id)) {
      rows.push(learner);
      await writeTable("learners", rows);
    }
  }

  appendSession(row: SessionRow) {
    return append("sessions", row);
  }

  appendResponse(row: ResponseRow) {
    return append("responses", row);
  }

  async upsertWeakness(row: WeaknessRow): Promise<void> {
    const rows = await readTable<WeaknessRow>("weakness_history");
    const idx = rows.findIndex(
      (r) => r.learner_id === row.learner_id && r.item_id === row.item_id
    );
    if (idx >= 0) rows[idx] = row;
    else rows.push(row);
    await writeTable("weakness_history", rows);
  }

  async getCache(hash: string): Promise<CacheRow | null> {
    const rows = await readTable<CacheRow>("sentence_cache");
    return rows.find((r) => r.sentence_hash === hash) ?? null;
  }

  async putCache(row: CacheRow): Promise<void> {
    const rows = await readTable<CacheRow>("sentence_cache");
    const idx = rows.findIndex((r) => r.sentence_hash === row.sentence_hash);
    if (idx >= 0) rows[idx] = row;
    else rows.push(row);
    await writeTable("sentence_cache", rows);
  }

  appendApiLog(row: ApiLogRow) {
    return append("api_log", row);
  }
}
