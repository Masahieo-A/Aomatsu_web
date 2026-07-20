/**
 * マスタの「正」データストア（要件 §4, §8）。
 * - 正: master_working.json（全ステータス・編集用）
 * - 保存のたびにタイムスタンプ付きバックアップを backups/ に自動生成（データ喪失防止）
 * - エクスポート成果物は exports/ に連番・日付付きで保存（上書きしない）
 *
 * 保存先は MASTER_DATA_DIR（例: Google Drive のローカル同期フォルダ）または .data/。
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import {
  GrammarItemSchema,
  SCHEMA_VERSION,
  type GrammarItem,
  type GrammarMaster,
} from "@zdp/schema";

const BASE_DIR =
  process.env.MASTER_DATA_DIR || path.join(process.cwd(), ".data");
const WORKING = path.join(BASE_DIR, "master_working.json");
const BACKUPS = path.join(BASE_DIR, "backups");
const EXPORTS = path.join(BASE_DIR, "exports");

export function paths() {
  return { BASE_DIR, WORKING, BACKUPS, EXPORTS };
}

async function fileExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function readJson(p: string): Promise<unknown | null> {
  try {
    return JSON.parse(await fs.readFile(p, "utf8"));
  } catch {
    return null;
  }
}

/** 初回起動時のシード（ZDPサンプル → data/seed_master.json → 最小埋め込みの順） */
async function seed(): Promise<GrammarMaster> {
  const candidates = [
    path.join(process.cwd(), "data", "seed_master.json"),
    path.join(process.cwd(), "..", "zdp", "data", "grammar_master.sample.json"),
  ];
  for (const c of candidates) {
    const raw = (await readJson(c)) as GrammarMaster | null;
    if (raw?.items?.length) return raw;
  }
  return {
    schema_version: SCHEMA_VERSION,
    deprecated_ids: [],
    items: [],
  };
}

export async function loadWorking(): Promise<GrammarMaster> {
  if (await fileExists(WORKING)) {
    const raw = (await readJson(WORKING)) as GrammarMaster | null;
    if (raw) return raw;
  }
  const seeded = await seed();
  await saveWorking(seeded, false);
  return seeded;
}

/** 保存。makeBackup=true のとき、保存前の状態を backups/ に退避する。 */
export async function saveWorking(
  master: GrammarMaster,
  makeBackup = true
): Promise<void> {
  await fs.mkdir(BASE_DIR, { recursive: true });
  if (makeBackup && (await fileExists(WORKING))) {
    await fs.mkdir(BACKUPS, { recursive: true });
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    const prev = await fs.readFile(WORKING, "utf8");
    await fs.writeFile(path.join(BACKUPS, `master_${ts}.json`), prev, "utf8");
  }
  master.exported_at = master.exported_at ?? undefined;
  await fs.writeFile(WORKING, JSON.stringify(master, null, 2), "utf8");
}

export async function getItems(): Promise<GrammarItem[]> {
  return (await loadWorking()).items;
}

export async function getItem(id: string): Promise<GrammarItem | null> {
  return (await getItems()).find((i) => i.id === id) ?? null;
}

/** 次の未使用ID（G + 3桁連番）を発行。既存の最大値+1。 */
export async function nextId(): Promise<string> {
  const items = await getItems();
  let max = 0;
  for (const it of items) {
    const m = it.id.match(/^G(\d+)$/);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return "G" + String(max + 1).padStart(3, "0");
}

/** 項目を upsert。version と updated_at を更新。 */
export async function upsertItem(item: GrammarItem): Promise<GrammarItem> {
  const master = await loadWorking();
  const idx = master.items.findIndex((i) => i.id === item.id);
  const now = new Date().toISOString();
  if (idx >= 0) {
    item.version = (master.items[idx].version ?? 1) + 1;
    item.created_at = master.items[idx].created_at;
    item.updated_at = now;
    master.items[idx] = item;
  } else {
    item.created_at = item.created_at || now;
    item.updated_at = now;
    item.version = item.version || 1;
    master.items.push(item);
  }
  await saveWorking(master);
  return item;
}

/** 完全な項目オブジェクトをデフォルト付きで生成（フォームの初期値等に使用） */
export function emptyItem(id: string): GrammarItem {
  return GrammarItemSchema.parse({
    id,
    name: "",
    status: "memo",
    level: "B1",
  });
}
