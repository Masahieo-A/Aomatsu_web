/**
 * 文法項目マスタのロード（読み取り専用 / 要件 §6）。
 * - T-02 でアップロードされた .data/grammar_master.json があればそれを使う
 * - 無ければ同梱の data/grammar_master.sample.json
 * - サーバメモリに5分TTLでキャッシュ（要件 §5 注記）
 * - schema_version を照合し、非対応メジャーは読み込み拒否 → 直前の正常版で継続（§6.4）
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import {
  GrammarMasterSchema,
  isCompatibleVersion,
  type GrammarItem,
  type GrammarMaster,
} from "@zdp/schema";

const TTL_MS = 5 * 60 * 1000;
const UPLOAD_PATH = path.join(process.cwd(), ".data", "grammar_master.json");
const SAMPLE_PATH = path.join(process.cwd(), "data", "grammar_master.sample.json");

interface CacheState {
  master: GrammarMaster;
  loadedAt: number;
  source: "uploaded" | "sample";
}
let state: CacheState | null = null;

async function readJson(p: string): Promise<unknown | null> {
  try {
    return JSON.parse(await fs.readFile(p, "utf8"));
  } catch {
    return null;
  }
}

export async function loadMaster(force = false): Promise<CacheState> {
  if (!force && state && Date.now() - state.loadedAt < TTL_MS) {
    return state;
  }

  const uploaded = await readJson(UPLOAD_PATH);
  const sample = uploaded ? null : await readJson(SAMPLE_PATH);
  const rawSource: "uploaded" | "sample" = uploaded ? "uploaded" : "sample";
  const raw = uploaded ?? sample;

  if (!raw) {
    if (state) return state; // 直前の正常版で継続
    throw new Error("grammar master not found (sample missing)");
  }

  // schema_version 照合（§6.4）
  const version = (raw as { schema_version?: string }).schema_version ?? "0";
  if (!isCompatibleVersion(version)) {
    console.error(
      `[master] 非対応 schema_version=${version}. 読み込みを拒否します。`
    );
    if (state) return state; // 直前の正常版で継続
    throw new Error(`incompatible schema_version: ${version}`);
  }

  const parsed = GrammarMasterSchema.safeParse(raw);
  if (!parsed.success) {
    console.error("[master] スキーマ検証に失敗:", parsed.error.issues[0]);
    if (state) return state;
    throw new Error("grammar master failed schema validation");
  }

  state = { master: parsed.data, loadedAt: Date.now(), source: rawSource };
  return state;
}

/** 診断で参照する対象は published のみ（安全側）。ただし sample は全published。 */
export async function getItems(): Promise<GrammarItem[]> {
  const { master } = await loadMaster();
  return master.items.filter(
    (i) => i.status === "published" || i.status === "verified"
  );
}

export async function getItemById(id: string): Promise<GrammarItem | null> {
  const items = await getItems();
  return items.find((i) => i.id === id) ?? null;
}

export async function masterMeta() {
  const { master, source, loadedAt } = await loadMaster();
  return {
    schema_version: master.schema_version,
    total: master.items.length,
    published: master.items.filter((i) => i.status === "published").length,
    source,
    loadedAt: new Date(loadedAt).toISOString(),
    deprecated_ids: master.deprecated_ids ?? [],
  };
}

/** T-02: アップロードされたマスタJSONを保存して差し替える */
export async function saveUploadedMaster(json: unknown): Promise<GrammarMaster> {
  const parsed = GrammarMasterSchema.safeParse(json);
  if (!parsed.success) {
    throw new Error(
      "アップロードされたJSONがスキーマに準拠していません: " +
        parsed.error.issues[0].message
    );
  }
  if (!isCompatibleVersion(parsed.data.schema_version)) {
    throw new Error(
      `非対応の schema_version: ${parsed.data.schema_version}`
    );
  }
  await fs.mkdir(path.dirname(UPLOAD_PATH), { recursive: true });
  await fs.writeFile(UPLOAD_PATH, JSON.stringify(parsed.data, null, 2), "utf8");
  state = null; // キャッシュ無効化
  return parsed.data;
}
