"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface Item {
  id: string;
  name: string;
  status: string;
  positive_examples: unknown[];
  negative_examples: unknown[];
}
interface Trial {
  sentence: string;
  expected: boolean;
  got: boolean;
  correct: boolean;
  evidence: string;
  votes: Record<string, number>;
}
interface Result {
  mock: boolean;
  accuracy: number;
  runs: number;
  correct: number;
  total: number;
  misjudged: Trial[];
  results: Trial[];
}

export default function TestbenchPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [selected, setSelected] = useState("");
  const [useConsistency, setUseConsistency] = useState(true);
  const [extraPos, setExtraPos] = useState("");
  const [extraNeg, setExtraNeg] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [batch, setBatch] = useState<{ id: string; name: string; accuracy: number }[] | null>(null);
  const [err, setErr] = useState("");

  async function load() {
    const r = await fetch("/api/items");
    const d = await r.json();
    setItems(d.items);
  }
  useEffect(() => {
    load();
    const p = new URLSearchParams(window.location.search).get("item");
    if (p) setSelected(p);
  }, []);

  async function run() {
    if (!selected) return;
    setLoading(true);
    setErr("");
    setResult(null);
    try {
      const r = await fetch("/api/testbench", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item_id: selected,
          use_consistency: useConsistency,
          extra_positive: extraPos.split("\n").filter((s) => s.trim()),
          extra_negative: extraNeg.split("\n").filter((s) => s.trim()),
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setResult(d);
      load();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function promote() {
    const item = items.find((i) => i.id === selected);
    if (!item) return;
    const full = await (await fetch(`/api/items/${selected}`)).json();
    const r = await fetch("/api/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...full.item, status: "verified" }),
    });
    const d = await r.json();
    if (!r.ok) setErr(d.error);
    else {
      setErr("");
      alert("verified に昇格しました");
      load();
    }
  }

  // B-06: 全published項目の一括回帰テスト
  async function runBatch() {
    const published = items.filter((i) => i.status === "published");
    const approxCalls = published.reduce(
      (a, i) => a + (i.positive_examples.length + i.negative_examples.length) * (useConsistency ? 3 : 1),
      0
    );
    if (!confirm(`published ${published.length}項目を回帰テストします。概算API呼び出し ${approxCalls}回。実行しますか？`))
      return;
    setLoading(true);
    const out: { id: string; name: string; accuracy: number }[] = [];
    for (const i of published) {
      const r = await fetch("/api/testbench", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item_id: i.id, use_consistency: useConsistency }),
      });
      const d = await r.json();
      out.push({ id: i.id, name: i.name, accuracy: d.accuracy ?? 0 });
    }
    setBatch(out);
    setLoading(false);
    load();
  }

  return (
    <main className="wrap space-y-4">
      <h1 className="text-lg font-bold">テストベンチ</h1>
      <p className="text-xs text-slate-500">
        登録済みの陽性例・陰性例を、ZDPアプリと同一の P-01 プロンプトで Gemini Flash に判定させ、
        正答率を測定します（正答率90%以上・runs 10回以上で verified 昇格可）。
      </p>

      <div className="card space-y-3">
        <div>
          <label className="label">対象項目</label>
          <select className="input" value={selected} onChange={(e) => setSelected(e.target.value)}>
            <option value="">選択してください</option>
            {items.map((i) => (
              <option key={i.id} value={i.id}>
                {i.id} {i.name}（{i.status} / +{i.positive_examples.length} -{i.negative_examples.length}）
              </option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={useConsistency} onChange={(e) => setUseConsistency(e.target.checked)} />
          self-consistency（3回多数決）を使う（B-02）
        </label>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div>
            <label className="label">一時的な陽性例（保存しない・B-04 / 1行1件）</label>
            <textarea className="input" rows={2} value={extraPos} onChange={(e) => setExtraPos(e.target.value)} />
          </div>
          <div>
            <label className="label">一時的な陰性例（保存しない / 1行1件）</label>
            <textarea className="input" rows={2} value={extraNeg} onChange={(e) => setExtraNeg(e.target.value)} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-primary" onClick={run} disabled={!selected || loading}>
            {loading ? "実行中…" : "テスト実行（B-01）"}
          </button>
          <button className="btn-ghost" onClick={runBatch} disabled={loading}>
            一括回帰テスト（B-06）
          </button>
        </div>
      </div>

      {err && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{err}</div>}

      {result && (
        <div className="card space-y-3">
          <div className="flex items-center gap-4">
            <div className="text-3xl font-bold">
              {Math.round(result.accuracy * 100)}%
            </div>
            <div className="text-sm text-slate-500">
              {result.correct}/{result.total} 正解 / runs {result.runs}
              {result.mock && <span className="ml-2 text-amber-600">[MOCK]</span>}
            </div>
            {result.accuracy >= 0.9 && result.runs >= 10 && (
              <button className="btn-primary ml-auto" onClick={promote}>
                verified に昇格
              </button>
            )}
          </div>

          {result.misjudged.length > 0 ? (
            <div>
              <p className="mb-1 text-sm font-semibold text-red-600">
                誤判定（B-03: どの記述を直せば改善するかの手がかり）
              </p>
              <ul className="space-y-1 text-sm">
                {result.misjudged.map((m, k) => (
                  <li key={k} className="rounded-lg bg-red-50 p-2">
                    <span className="font-mono text-xs">
                      期待={String(m.expected)} / 判定={String(m.got)} / votes {JSON.stringify(m.votes)}
                    </span>
                    <div>{m.sentence}</div>
                    {m.evidence && <div className="text-xs text-slate-500">evidence: {m.evidence}</div>}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-green-700">全例文を正しく判定できました。</p>
          )}
          <Link href={`/items/${selected}`} className="text-sm text-brand underline">
            この項目を編集する
          </Link>
        </div>
      )}

      {batch && (
        <div className="card">
          <h2 className="mb-2 text-sm font-semibold">一括回帰テスト結果</h2>
          <table className="w-full text-sm">
            <tbody>
              {batch.map((b) => (
                <tr key={b.id} className="border-t border-slate-100">
                  <td className="p-2 font-mono text-xs">{b.id}</td>
                  <td className="p-2">{b.name}</td>
                  <td className={`p-2 text-right font-medium ${b.accuracy < 0.9 ? "text-red-600" : "text-green-700"}`}>
                    {Math.round(b.accuracy * 100)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
