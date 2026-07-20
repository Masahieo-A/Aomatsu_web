import { promises as fs } from "fs";
import path from "path";
import type { TableName, TableRowMap } from "@/types";
import type { StorageAdapter } from "./adapter";

// ORAL_EXAM_DB_DIR はゴールデンセット回帰テスト等が一時DBを使うための上書き
const DB_DIR =
  process.env.ORAL_EXAM_DB_DIR ?? path.join(process.cwd(), "data", "db");

/**
 * ローカルJSONフォールバックドライバ（要件定義 §6）。
 * data/db/<table>.json に行の配列をそのまま保存する。
 * Sheets と異なり複雑な構造（analysis, anchor, gate1〜3）はネイティブの
 * オブジェクトとして保持する（セル内JSON文字列化は Sheets 側の責務）。
 */
export class JsonStorageAdapter implements StorageAdapter {
  // 書き込みを直列化するためのテーブル別プロミスチェーン
  private writeLocks = new Map<TableName, Promise<void>>();

  private filePath(table: TableName): string {
    return path.join(DB_DIR, `${table}.json`);
  }

  private async readTable<T extends TableName>(
    table: T
  ): Promise<TableRowMap[T][]> {
    try {
      const raw = await fs.readFile(this.filePath(table), "utf-8");
      return JSON.parse(raw) as TableRowMap[T][];
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw err;
    }
  }

  private async writeTable<T extends TableName>(
    table: T,
    rows: TableRowMap[T][]
  ): Promise<void> {
    await fs.mkdir(DB_DIR, { recursive: true });
    const tmp = this.filePath(table) + ".tmp";
    await fs.writeFile(tmp, JSON.stringify(rows, null, 2), "utf-8");
    await fs.rename(tmp, this.filePath(table));
  }

  private withLock<T extends TableName>(
    table: T,
    fn: () => Promise<void>
  ): Promise<void> {
    const prev = this.writeLocks.get(table) ?? Promise.resolve();
    const next = prev.then(fn, fn);
    this.writeLocks.set(table, next);
    return next;
  }

  async list<T extends TableName>(
    table: T,
    filter?: Partial<TableRowMap[T]>
  ): Promise<TableRowMap[T][]> {
    const rows = await this.readTable(table);
    if (!filter) return rows;
    const entries = Object.entries(filter);
    return rows.filter((row) =>
      entries.every(([key, value]) => (row as Record<string, unknown>)[key] === value)
    );
  }

  async insert<T extends TableName>(
    table: T,
    rows: TableRowMap[T][]
  ): Promise<void> {
    if (rows.length === 0) return;
    return this.withLock(table, async () => {
      const existing = await this.readTable(table);
      await this.writeTable(table, [...existing, ...rows]);
    });
  }

  async update<T extends TableName>(
    table: T,
    idColumn: keyof TableRowMap[T] & string,
    id: string,
    patch: Partial<TableRowMap[T]>
  ): Promise<void> {
    return this.withLock(table, async () => {
      const rows = await this.readTable(table);
      const index = rows.findIndex(
        (row) => (row as Record<string, unknown>)[idColumn] === id
      );
      if (index === -1) {
        throw new Error(`${table}.${idColumn}=${id} が見つかりません`);
      }
      rows[index] = { ...rows[index], ...patch };
      await this.writeTable(table, rows);
    });
  }
}
