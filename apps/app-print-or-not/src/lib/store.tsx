"use client";
// 生徒の作業状態（端末内 localStorage）と、共有DBへの送信キュー。
// 保存は毎回「読み直し＋差分マージ」で行い、古いメモリ上の状態で上書きしない。
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ApiResult, Settings, StudentState, SyncKind, SyncRequest } from "./types";
import { DEFAULT_SETTINGS } from "./content";

const STATE_KEY = "pon:v1:state";
const QUEUE_KEY = "pon:v1:queue";

export function emptyState(classId: string, number: number): StudentState {
  return {
    version: 1,
    classId,
    number,
    hookDone: false,
    hookAnswers: {},
    readArticles: [],
    lv2Read: [],
    guesses: {},
    factOpinionAnswers: {},
    cards: {},
    sortDone: false,
    trapDone: false,
    hintCounts: {},
  };
}

function readState(): StudentState | null {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as StudentState;
    return s && s.version === 1 ? s : null;
  } catch {
    return null;
  }
}

function writeState(s: StudentState | null) {
  try {
    if (s) localStorage.setItem(STATE_KEY, JSON.stringify(s));
    else localStorage.removeItem(STATE_KEY);
  } catch {
    // 保存できない環境（プライベートモード等）では画面上の状態だけで続行する
  }
}

function readQueue(): SyncRequest[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? "[]") as SyncRequest[];
  } catch {
    return [];
  }
}

function writeQueue(q: SyncRequest[]) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(q.slice(-500)));
  } catch {}
}

export type SyncStatus = "idle" | "ok" | "offline" | "no-db";

async function postSync(req: SyncRequest): Promise<ApiResult> {
  const res = await fetch("/api/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  return (await res.json()) as ApiResult;
}

interface StudentCtx {
  ready: boolean;
  state: StudentState | null;
  settings: Settings;
  syncStatus: SyncStatus;
  start: (classId: string, number: number) => void;
  update: (fn: (s: StudentState) => StudentState) => void;
  sync: (kind: SyncKind, payload: unknown) => void;
  signOut: () => void;
}

const Ctx = createContext<StudentCtx | null>(null);

export function StudentProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [state, setState] = useState<StudentState | null>(null);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");

  useEffect(() => {
    // localStorage はブラウザでしか読めないため、マウント後に読み込む
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(readState());
    setReady(true);
    fetch("/api/settings")
      .then((r) => r.json())
      .then((r: ApiResult<Settings>) => {
        if (r.ok && r.data) setSettings({ ...DEFAULT_SETTINGS, ...r.data });
      })
      .catch(() => {});
  }, []);

  const flush = useCallback(async () => {
    const queue = readQueue();
    if (queue.length === 0) return;
    const rest: SyncRequest[] = [];
    for (let i = 0; i < queue.length; i++) {
      try {
        const r = await postSync(queue[i]);
        if (r.noDb) {
          // DB 未設定: 送信はやめ、端末内保存だけで続行
          setSyncStatus("no-db");
          writeQueue([]);
          return;
        }
        if (!r.ok) rest.push(queue[i]);
      } catch {
        rest.push(...queue.slice(i));
        setSyncStatus("offline");
        break;
      }
    }
    writeQueue([...rest, ...readQueue().slice(queue.length)]);
    if (rest.length === 0) setSyncStatus("ok");
  }, []);

  useEffect(() => {
    // flush 内の setState は await 後（送信結果を受けてから）なので連鎖レンダーにはならない
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (ready) void flush();
  }, [ready, flush]);

  const start = useCallback((classId: string, number: number) => {
    const cur = readState();
    // 同じ端末で別の出席番号に切り替えた場合は、前の人の作業を引き継がない
    const next = cur && cur.classId === classId && cur.number === number ? cur : emptyState(classId, number);
    if (cur && next !== cur) writeQueue([]);
    writeState(next);
    setState(next);
  }, []);

  const update = useCallback((fn: (s: StudentState) => StudentState) => {
    const cur = readState();
    if (!cur) return;
    const next = fn(cur);
    writeState(next);
    setState(next);
  }, []);

  const sync = useCallback(
    (kind: SyncKind, payload: unknown) => {
      const cur = readState();
      if (!cur || syncStatus === "no-db") return;
      writeQueue([...readQueue(), { classId: cur.classId, number: cur.number, kind, payload }]);
      void flush();
    },
    [flush, syncStatus],
  );

  const signOut = useCallback(() => {
    writeState(null);
    writeQueue([]);
    setState(null);
  }, []);

  const value = useMemo(
    () => ({ ready, state, settings, syncStatus, start, update, sync, signOut }),
    [ready, state, settings, syncStatus, start, update, sync, signOut],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStudent(): StudentCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("StudentProvider がありません");
  return c;
}

export function hintKey(articleId: string, level: string, paragraph: number, hint: number): string {
  return `${articleId}:${level}:${paragraph}:${hint}`;
}

export function guessKey(articleId: string, index: number): string {
  return `${articleId}:${index}`;
}
