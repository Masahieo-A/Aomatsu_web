/**
 * 辞書コンポーネント
 * 日本語→英語候補（Jisho API）と英語→類義語（Datamuse API）を提供する。
 */
"use client";

import { useState } from "react";

/* ===== 型 ===== */
type JaEnResult = { word: string; pos: string; reading: string };
type EnSynResult = { word: string; pos: string; def: string };

const POS_OPTIONS = ["", "名詞", "動詞", "形容詞", "副詞"] as const;

/* ===== 共通スタイル定数 ===== */
const S = {
  input:
    "flex-1 rounded-[6px] border border-[#e2ddd8] bg-[#f8f7f4] px-3 py-[7px] text-sm text-[#1a1714] outline-none transition focus:border-[#52b788]",
  select:
    "rounded-[6px] border border-[#e2ddd8] bg-[#f8f7f4] px-2 py-[7px] text-sm text-[#1a1714]",
  searchBtn:
    "rounded-[6px] bg-[#2d6a4f] px-3 py-[7px] text-sm font-bold text-white transition hover:bg-[#1f5238] disabled:opacity-50",
  label:
    "mb-2 text-[11px] font-bold uppercase tracking-widest text-[#6b645c]",
  resultBox:
    "mt-2 min-h-[72px] rounded-[8px] border border-[#e2ddd8] bg-[#f8f7f4] p-3 text-sm leading-relaxed",
} as const;

/* ===== 日本語→英語パネル ===== */
function JaEnPanel() {
  const [q, setQ] = useState("");
  const [pos, setPos] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<JaEnResult[] | null>(null);
  const [error, setError] = useState("");

  const search = async () => {
    if (!q.trim()) return;
    setLoading(true);
    setError("");
    setResults(null);
    try {
      const params = new URLSearchParams({ q: q.trim() });
      if (pos) params.set("pos", pos);
      const res = await fetch(`/api/dictionary/ja-en?${params}`);
      const json = (await res.json()) as { results?: JaEnResult[]; error?: string };
      if (!res.ok || json.error) {
        setError(json.error ?? "検索に失敗しました");
      } else {
        setResults(json.results ?? []);
      }
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <p className={S.label}>日本語 → 英語候補</p>
      <div className="flex gap-2">
        <input
          className={S.input}
          type="text"
          placeholder="例：感動"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search()}
        />
        <select
          className={S.select}
          value={pos}
          onChange={(e) => setPos(e.target.value)}
        >
          {POS_OPTIONS.map((p) => (
            <option key={p} value={p}>
              {p || "品詞"}
            </option>
          ))}
        </select>
        <button className={S.searchBtn} onClick={search} disabled={loading}>
          {loading ? "…" : "検索"}
        </button>
      </div>

      <div className={S.resultBox}>
        {error && <p className="text-[#c0392b]">{error}</p>}
        {results === null && !error && (
          <p className="italic text-[#6b645c]">検索結果がここに表示されます</p>
        )}
        {results?.length === 0 && (
          <p className="italic text-[#6b645c]">該当する単語が見つかりませんでした</p>
        )}
        {results && results.length > 0 && (
          <ul className="space-y-1">
            {results.map((r, i) => (
              <li key={i}>
                <span className="font-bold text-[#2d6a4f]">{r.word}</span>
                {r.pos && (
                  <span className="ml-1 text-[11px] italic text-[#6b645c]">
                    {r.pos}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/* ===== 英語→類義語パネル ===== */
function EnSynPanel() {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<EnSynResult[] | null>(null);
  const [error, setError] = useState("");

  const search = async () => {
    if (!q.trim()) return;
    setLoading(true);
    setError("");
    setResults(null);
    try {
      const res = await fetch(
        `/api/dictionary/en-syn?q=${encodeURIComponent(q.trim())}`
      );
      const json = (await res.json()) as { results?: EnSynResult[]; error?: string };
      if (!res.ok || json.error) {
        setError(json.error ?? "検索に失敗しました");
      } else {
        setResults(json.results ?? []);
      }
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <p className={S.label}>英語 → 類義語</p>
      <div className="flex gap-2">
        <input
          className={S.input}
          type="text"
          placeholder="e.g. happy"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search()}
        />
        <button className={S.searchBtn} onClick={search} disabled={loading}>
          {loading ? "…" : "Search"}
        </button>
      </div>

      <div className={S.resultBox}>
        {error && <p className="text-[#c0392b]">{error}</p>}
        {results === null && !error && (
          <p className="italic text-[#6b645c]">検索結果がここに表示されます</p>
        )}
        {results?.length === 0 && (
          <p className="italic text-[#6b645c]">類義語が見つかりませんでした</p>
        )}
        {results && results.length > 0 && (
          <ul className="space-y-1">
            {results.map((r, i) => (
              <li key={i}>
                <span className="font-bold text-[#2d6a4f]">{r.word}</span>
                {r.pos && (
                  <span className="ml-1 text-[11px] italic text-[#6b645c]">
                    {r.pos}
                  </span>
                )}
                {r.def && (
                  <span className="ml-2 text-[#6b645c]">— {r.def}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/* ===== メインコンポーネント ===== */
export function Dictionary({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="overflow-hidden rounded-[10px] border border-[#e2ddd8] bg-white">
      {/* ヘッダー（開閉トグル） */}
      <button
        type="button"
        className="flex w-full cursor-pointer items-center gap-3 border-b border-[#e2ddd8] px-4 py-3 text-left transition hover:bg-[#f8f7f4]"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-[#d8f3dc] text-base">
          📖
        </span>
        <div>
          <p className="text-sm font-bold text-[#1a1714]">辞書</p>
          <p className="text-xs text-[#6b645c]">日英変換・英語類義語を検索</p>
        </div>
        <span className="ml-auto text-xs text-[#6b645c]">
          {open ? "▲" : "▼"}
        </span>
      </button>

      {/* コンテンツ */}
      {open && (
        <div className="grid gap-4 p-4 sm:grid-cols-2">
          <JaEnPanel />
          <EnSynPanel />
        </div>
      )}
    </div>
  );
}
