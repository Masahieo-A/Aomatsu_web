// 共有DBの入口。サーバー専用（クライアントから import しない）。
// - SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY があれば Supabase（service role）
// - 無く、かつ本番以外なら .data/dev-db.json（開発用）
// - 本番で無ければ null（API は noDb を返し、生徒の端末内保存だけで動く）
import { promises as fs } from "node:fs";
import path from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { ClassStats, Settings, Side } from "@/lib/types";

export interface StanceRow {
  classId: string;
  number: number;
  stanceBefore: number | null;
  stanceAfter: number | null;
  stanceReason: string | null;
  updatedAt: string;
}

/** 来た項目だけを更新する（undefined は「触らない」）。stanceReason の null は消去 */
export interface StancePatch {
  stanceBefore?: number;
  stanceAfter?: number;
  stanceReason?: string | null;
}

export interface CardInput {
  classId: string;
  number: number;
  articleId: string;
  side: Side;
  point: string;
  sourceSentence: string;
  fact: string;
  numberExample: string;
  soWhat: string;
  weakPoint: string;
}

export interface CardRow extends CardInput {
  createdAt: string;
  updatedAt: string;
}

export interface HintInput {
  classId: string;
  number: number;
  articleId: string;
  level: "lv1" | "lv2";
  paragraph: number;
  hint: 1 | 2 | 3;
}

export interface HintCount {
  articleId: string;
  level: "lv1" | "lv2";
  paragraph: number;
  count: number;
}

export interface PurgeResult {
  students: number;
  cards: number;
  hints: number;
}

export interface Repo {
  readonly kind: "supabase" | "json";
  getSettings(): Promise<Settings | null>;
  saveSettings(settings: Settings): Promise<void>;
  upsertStance(classId: string, number: number, patch: StancePatch): Promise<void>;
  upsertCard(card: CardInput): Promise<void>;
  addHint(hint: HintInput): Promise<void>;
  /** 匿名の前後分布（出席番号を含まない） */
  getStats(classId?: string): Promise<ClassStats>;
  listStudents(classId?: string): Promise<StanceRow[]>;
  listCards(classId?: string): Promise<CardRow[]>;
  /** 段落ごとのヒント開示回数（多い順） */
  hintCounts(classId?: string): Promise<HintCount[]>;
  purgeAll(): Promise<PurgeResult>;
}

// ---- 共通の集計 ----

interface StanceEntry {
  before: number | null;
  after: number | null;
  n: number;
}

function buildStats(classId: string | undefined, entries: StanceEntry[]): ClassStats {
  const before = [0, 0, 0, 0, 0];
  const after = [0, 0, 0, 0, 0];
  let students = 0;
  for (const e of entries) {
    students += e.n;
    if (e.before !== null && e.before >= 1 && e.before <= 5) before[e.before - 1] += e.n;
    if (e.after !== null && e.after >= 1 && e.after <= 5) after[e.after - 1] += e.n;
  }
  return { classId: classId ?? "all", before, after, students };
}

function sortHintCounts(map: Map<string, HintCount>): HintCount[] {
  return [...map.values()].sort(
    (a, b) =>
      b.count - a.count ||
      a.articleId.localeCompare(b.articleId) ||
      a.level.localeCompare(b.level) ||
      a.paragraph - b.paragraph,
  );
}

function hintMapKey(articleId: string, level: string, paragraph: number): string {
  return `${articleId}:${level}:${paragraph}`;
}

function compareClassNumber(a: { classId: string; number: number }, b: { classId: string; number: number }): number {
  return a.classId.localeCompare(b.classId, "en", { numeric: true }) || a.number - b.number;
}

// ---- Supabase 実装 ----

const PAGE_SIZE = 1000; // PostgREST の既定上限

type Row = Record<string, unknown>;

class SupabaseRepo implements Repo {
  readonly kind = "supabase" as const;
  private sb: SupabaseClient;

  constructor(url: string, serviceKey: string) {
    // サーバーでのみ使う。セッションは保持しない
    this.sb = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  }

  private fail(error: { message: string } | null): never | void {
    if (error) throw new Error(`Supabase: ${error.message}`);
  }

  /** 1000件を超えても取りこぼさないよう、ページ送りで全件取る */
  private async fetchAll(table: string, orderBy: string[], classId?: string): Promise<Row[]> {
    const out: Row[] = [];
    for (let from = 0; ; from += PAGE_SIZE) {
      let q = this.sb.from(table).select("*");
      if (classId) q = q.eq("class_id", classId);
      for (const col of orderBy) q = q.order(col, { ascending: true });
      const { data, error } = await q.range(from, from + PAGE_SIZE - 1);
      this.fail(error);
      const rows = (data ?? []) as Row[];
      out.push(...rows);
      if (rows.length < PAGE_SIZE) break;
    }
    return out;
  }

  async getSettings(): Promise<Settings | null> {
    const { data, error } = await this.sb.from("settings").select("data").eq("id", 1).maybeSingle();
    this.fail(error);
    return (data?.data as Settings | undefined) ?? null;
  }

  async saveSettings(settings: Settings): Promise<void> {
    const { error } = await this.sb
      .from("settings")
      .upsert({ id: 1, data: settings, updated_at: new Date().toISOString() }, { onConflict: "id" });
    this.fail(error);
  }

  async upsertStance(classId: string, number: number, patch: StancePatch): Promise<void> {
    // 来た列だけを payload に入れる（PostgREST の upsert は payload にある列だけ更新する）
    const row: Row = { class_id: classId, number, updated_at: new Date().toISOString() };
    if (patch.stanceBefore !== undefined) row.stance_before = patch.stanceBefore;
    if (patch.stanceAfter !== undefined) row.stance_after = patch.stanceAfter;
    if (patch.stanceReason !== undefined) row.stance_reason = patch.stanceReason;
    const { error } = await this.sb.from("students").upsert(row, { onConflict: "class_id,number" });
    this.fail(error);
  }

  async upsertCard(c: CardInput): Promise<void> {
    // created_at は送らない（新規時は DB 既定値、更新時は元の値が残る）
    const { error } = await this.sb.from("cards").upsert(
      {
        class_id: c.classId,
        number: c.number,
        article_id: c.articleId,
        side: c.side,
        point: c.point,
        source_sentence: c.sourceSentence,
        fact: c.fact,
        number_example: c.numberExample,
        so_what: c.soWhat,
        weak_point: c.weakPoint,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "class_id,number,article_id" },
    );
    this.fail(error);
  }

  async addHint(h: HintInput): Promise<void> {
    const { error } = await this.sb.from("hint_logs").insert({
      class_id: h.classId,
      number: h.number,
      article_id: h.articleId,
      level: h.level,
      paragraph: h.paragraph,
      hint: h.hint,
    });
    this.fail(error);
  }

  async getStats(classId?: string): Promise<ClassStats> {
    // 出席番号を含まない匿名集計ビューだけを読む
    const rows = await this.fetchAll("class_stance_view", ["stance_before", "stance_after"], classId);
    return buildStats(
      classId,
      rows.map((r) => ({
        before: (r.stance_before as number | null) ?? null,
        after: (r.stance_after as number | null) ?? null,
        n: Number(r.students ?? 0),
      })),
    );
  }

  async listStudents(classId?: string): Promise<StanceRow[]> {
    const rows = await this.fetchAll("students", ["class_id", "number"], classId);
    return rows.map((r) => ({
      classId: String(r.class_id),
      number: Number(r.number),
      stanceBefore: (r.stance_before as number | null) ?? null,
      stanceAfter: (r.stance_after as number | null) ?? null,
      stanceReason: (r.stance_reason as string | null) ?? null,
      updatedAt: String(r.updated_at ?? ""),
    }));
  }

  async listCards(classId?: string): Promise<CardRow[]> {
    const rows = await this.fetchAll("cards", ["class_id", "number", "article_id"], classId);
    return rows.map((r) => ({
      classId: String(r.class_id),
      number: Number(r.number),
      articleId: String(r.article_id),
      side: r.side === "con" ? "con" : "pro",
      point: String(r.point ?? ""),
      sourceSentence: String(r.source_sentence ?? ""),
      fact: String(r.fact ?? ""),
      numberExample: String(r.number_example ?? ""),
      soWhat: String(r.so_what ?? ""),
      weakPoint: String(r.weak_point ?? ""),
      createdAt: String(r.created_at ?? ""),
      updatedAt: String(r.updated_at ?? ""),
    }));
  }

  async hintCounts(classId?: string): Promise<HintCount[]> {
    const rows = await this.fetchAll("hint_paragraph_view", ["article_id", "level", "paragraph"], classId);
    const map = new Map<string, HintCount>();
    for (const r of rows) {
      const level = r.level === "lv2" ? "lv2" : "lv1";
      const key = hintMapKey(String(r.article_id), level, Number(r.paragraph));
      const cur = map.get(key);
      const n = Number(r.opens ?? 0);
      if (cur) cur.count += n;
      else map.set(key, { articleId: String(r.article_id), level, paragraph: Number(r.paragraph), count: n });
    }
    return sortHintCounts(map);
  }

  async purgeAll(): Promise<PurgeResult> {
    // DELETE には条件が必要なため、必ず真になる条件を付けて全行を消す
    const del = async (table: string, col: string): Promise<number> => {
      const { count, error } = await this.sb.from(table).delete({ count: "exact" }).gte(col, 0);
      this.fail(error);
      return count ?? 0;
    };
    const hints = await del("hint_logs", "id");
    const cards = await del("cards", "number");
    const students = await del("students", "number");
    return { students, cards, hints };
  }
}

// ---- 開発用 JSON ファイル実装 ----

interface DevDb {
  students: Record<string, StanceRow>;
  cards: Record<string, CardRow>;
  hints: (HintInput & { createdAt: string })[];
  settings: Settings | null;
}

function emptyDevDb(): DevDb {
  return { students: {}, cards: {}, hints: [], settings: null };
}

class JsonRepo implements Repo {
  readonly kind = "json" as const;
  private file = path.join(process.cwd(), ".data", "dev-db.json");
  // 同一プロセス内の書き込みは直列化し、毎回ファイルを読み直して差分だけ反映する
  private queue: Promise<unknown> = Promise.resolve();

  private async read(): Promise<DevDb> {
    let text: string;
    try {
      text = await fs.readFile(this.file, "utf8");
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "ENOENT") return emptyDevDb();
      throw e;
    }
    // 壊れたファイルは上書きせず例外にする（データを失わないため）
    const parsed = JSON.parse(text) as Partial<DevDb>;
    return { ...emptyDevDb(), ...parsed };
  }

  private async write(db: DevDb): Promise<void> {
    await fs.mkdir(path.dirname(this.file), { recursive: true });
    const tmp = `${this.file}.${process.pid}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(db, null, 2), "utf8");
    await fs.rename(tmp, this.file);
  }

  private mutate<T>(fn: (db: DevDb) => T): Promise<T> {
    const run = async () => {
      const db = await this.read();
      const result = fn(db);
      await this.write(db);
      return result;
    };
    const p = this.queue.then(run, run);
    this.queue = p.catch(() => undefined);
    return p;
  }

  private async view<T>(fn: (db: DevDb) => T): Promise<T> {
    await this.queue.catch(() => undefined);
    return fn(await this.read());
  }

  getSettings(): Promise<Settings | null> {
    return this.view((db) => db.settings);
  }

  async saveSettings(settings: Settings): Promise<void> {
    await this.mutate((db) => {
      db.settings = settings;
    });
  }

  async upsertStance(classId: string, number: number, patch: StancePatch): Promise<void> {
    await this.mutate((db) => {
      const key = `${classId}:${number}`;
      const cur: StanceRow = db.students[key] ?? {
        classId,
        number,
        stanceBefore: null,
        stanceAfter: null,
        stanceReason: null,
        updatedAt: "",
      };
      if (patch.stanceBefore !== undefined) cur.stanceBefore = patch.stanceBefore;
      if (patch.stanceAfter !== undefined) cur.stanceAfter = patch.stanceAfter;
      if (patch.stanceReason !== undefined) cur.stanceReason = patch.stanceReason;
      cur.updatedAt = new Date().toISOString();
      db.students[key] = cur;
    });
  }

  async upsertCard(c: CardInput): Promise<void> {
    await this.mutate((db) => {
      const key = `${c.classId}:${c.number}:${c.articleId}`;
      const now = new Date().toISOString();
      db.cards[key] = { ...c, createdAt: db.cards[key]?.createdAt ?? now, updatedAt: now };
    });
  }

  async addHint(h: HintInput): Promise<void> {
    await this.mutate((db) => {
      db.hints.push({ ...h, createdAt: new Date().toISOString() });
    });
  }

  getStats(classId?: string): Promise<ClassStats> {
    return this.view((db) => {
      const rows = Object.values(db.students).filter((s) => !classId || s.classId === classId);
      return buildStats(
        classId,
        rows.map((s) => ({ before: s.stanceBefore, after: s.stanceAfter, n: 1 })),
      );
    });
  }

  listStudents(classId?: string): Promise<StanceRow[]> {
    return this.view((db) =>
      Object.values(db.students)
        .filter((s) => !classId || s.classId === classId)
        .sort(compareClassNumber),
    );
  }

  listCards(classId?: string): Promise<CardRow[]> {
    return this.view((db) =>
      Object.values(db.cards)
        .filter((c) => !classId || c.classId === classId)
        .sort((a, b) => compareClassNumber(a, b) || a.articleId.localeCompare(b.articleId)),
    );
  }

  hintCounts(classId?: string): Promise<HintCount[]> {
    return this.view((db) => {
      const map = new Map<string, HintCount>();
      for (const h of db.hints) {
        if (classId && h.classId !== classId) continue;
        const key = hintMapKey(h.articleId, h.level, h.paragraph);
        const cur = map.get(key);
        if (cur) cur.count += 1;
        else map.set(key, { articleId: h.articleId, level: h.level, paragraph: h.paragraph, count: 1 });
      }
      return sortHintCounts(map);
    });
  }

  purgeAll(): Promise<PurgeResult> {
    return this.mutate((db) => {
      const result = {
        students: Object.keys(db.students).length,
        cards: Object.keys(db.cards).length,
        hints: db.hints.length,
      };
      db.students = {};
      db.cards = {};
      db.hints = [];
      return result;
    });
  }
}

// ---- 選択 ----

let cached: Repo | null | undefined;

export function getRepo(): Repo | null {
  if (cached !== undefined) return cached;
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (url && key) cached = new SupabaseRepo(url, key);
  else if (process.env.NODE_ENV !== "production") cached = new JsonRepo();
  else cached = null;
  return cached;
}

/** 単体確認用（環境変数に依存せず JSON 実装を作る） */
export function createJsonRepoForTest(): Repo {
  return new JsonRepo();
}
