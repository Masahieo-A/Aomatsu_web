"use client";
// 生徒の作業状態。サーバーには送らず、端末内（localStorage）だけに保存する。
// 保存は毎回「読み直し＋差分マージ」で行い、古いメモリ上の状態で上書きしない。
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Settings, StudentState } from "./types";
import { DEFAULT_SETTINGS } from "./content";

const STATE_KEY = "pon:v1:state";
// 旧版（共有DBあり）で使っていた送信キュー。残っていれば片付ける
const LEGACY_QUEUE_KEY = "pon:v1:queue";

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

interface StudentCtx {
  ready: boolean;
  state: StudentState | null;
  settings: Settings;
  start: (classId: string, number: number) => void;
  update: (fn: (s: StudentState) => StudentState) => void;
  signOut: () => void;
}

const Ctx = createContext<StudentCtx | null>(null);

export function StudentProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [state, setState] = useState<StudentState | null>(null);

  useEffect(() => {
    try {
      localStorage.removeItem(LEGACY_QUEUE_KEY);
    } catch {}
    // localStorage はブラウザでしか読めないため、マウント後に読み込む
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(readState());
    setReady(true);
  }, []);

  const start = useCallback((classId: string, number: number) => {
    const cur = readState();
    // 同じ端末で別の出席番号に切り替えた場合は、前の人の作業を引き継がない
    const next = cur && cur.classId === classId && cur.number === number ? cur : emptyState(classId, number);
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

  const signOut = useCallback(() => {
    writeState(null);
    setState(null);
  }, []);

  const value = useMemo(
    () => ({ ready, state, settings: DEFAULT_SETTINGS, start, update, signOut }),
    [ready, state, start, update, signOut],
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
