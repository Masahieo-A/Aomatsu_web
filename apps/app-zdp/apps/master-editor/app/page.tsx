"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface Item {
  id: string;
  name: string;
  status: string;
  level: string;
  prerequisites: string[];
  positive_examples: unknown[];
  negative_examples: unknown[];
  test_results: { accuracy: number | null; runs: number };
}

const STATUSES = ["memo", "draft", "verified", "published", "deprecated"];
const LEVELS = ["A1", "A2", "B1", "B2", "C1"];

export default function Dashboard() {
  const [items, setItems] = useState<Item[]>([]);
  const [exportMsg, setExportMsg] = useState("");
  const [issues, setIssues] = useState<{ message: string }[]>([]);

  async function load() {
    const r = await fetch("/api/items");
    const d = await r.json();
    setItems(d.items);
  }
  useEffect(() => {
    load();
  }, []);

  const countByStatus = (s: string) => items.filter((i) => i.status === s).length;

  async function doExport() {
    setExportMsg("");
    setIssues([]);
    const r = await fetch("/api/export");
    const d = await r.json();
    if (!d.ok) {
      setIssues(d.issues || [{ message: d.error }]);
      return;
    }
    // ダウンロード
    const blob = new Blob([JSON.stringify(d.master, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "grammar_master.json";
    a.click();
    URL.revokeObjectURL(url);
    setExportMsg(`エクスポート成功: ${d.total}項目 / 保存: ${d.saved_as}`);
  }

  async function doImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const json = JSON.parse(await file.text());
    const r = await fetch("/api/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(json),
    });
    const d = await r.json();
    if (d.ok) {
      setExportMsg(`インポート成功: ${d.total}項目`);
      load();
    } else {
      setIssues([{ message: d.error }]);
    }
  }

  return (
    <main className="wrap space-y-6">
      {/* D-01 ステータス別 */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {STATUSES.map((s) => (
          <div key={s} className="card text-center">
            <div className="text-2xl font-bold">{countByStatus(s)}</div>
            <div className={`badge-${s} mt-1`}>{s}</div>
          </div>
        ))}
      </section>

      {/* D-02 レベル×ステータス カバレッジ */}
      <section className="card overflow-x-auto">
        <h2 className="mb-2 text-sm font-semibold">
          カバレッジ（レベル × ステータス / D-02）
        </h2>
        <table className="w-full text-center text-xs">
          <thead>
            <tr className="text-slate-400">
              <th className="p-1 text-left">Level</th>
              {STATUSES.map((s) => (
                <th key={s} className="p-1">
                  {s}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {LEVELS.map((lv) => (
              <tr key={lv} className="border-t border-slate-100">
                <td className="p-1 text-left font-medium">{lv}</td>
                {STATUSES.map((s) => {
                  const n = items.filter(
                    (i) => i.level === lv && i.status === s
                  ).length;
                  return (
                    <td key={s} className={`p-1 ${n === 0 ? "text-slate-200" : ""}`}>
                      {n}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* 入出力 */}
      <section className="card space-y-3">
        <h2 className="text-sm font-semibold">入出力（IO）</h2>
        <div className="flex flex-wrap gap-2">
          <button className="btn-primary" onClick={doExport}>
            grammar_master.json をエクスポート（published のみ・検証付き）
          </button>
          <a className="btn-ghost" href="/api/csv">
            CSVエクスポート
          </a>
          <label className="btn-ghost cursor-pointer">
            JSONインポート
            <input
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={doImport}
            />
          </label>
        </div>
        {exportMsg && <p className="text-sm text-green-700">{exportMsg}</p>}
        {issues.length > 0 && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
            <p className="font-medium">
              エクスポート中止（検証エラー / §6.2）:
            </p>
            <ul className="mt-1 list-disc pl-5">
              {issues.map((i, k) => (
                <li key={k}>{i.message}</li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* 項目一覧 */}
      <section className="card">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">項目一覧（{items.length}）</h2>
          <Link href="/items/new" className="btn-primary">
            + 新規
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-slate-400">
              <tr>
                <th className="p-2">ID</th>
                <th className="p-2">名称</th>
                <th className="p-2">状態</th>
                <th className="p-2">Lv</th>
                <th className="p-2">例(+/-)</th>
                <th className="p-2">精度</th>
                <th className="p-2"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.id} className="border-t border-slate-100">
                  <td className="p-2 font-mono text-xs">{i.id}</td>
                  <td className="p-2">{i.name || <span className="text-slate-300">（無題）</span>}</td>
                  <td className="p-2">
                    <span className={`badge-${i.status}`}>{i.status}</span>
                  </td>
                  <td className="p-2">{i.level}</td>
                  <td className="p-2 text-xs">
                    {i.positive_examples.length}/{i.negative_examples.length}
                  </td>
                  <td className="p-2 text-xs">
                    {i.test_results.accuracy != null
                      ? `${Math.round(i.test_results.accuracy * 100)}% (${i.test_results.runs})`
                      : "—"}
                  </td>
                  <td className="p-2 text-right">
                    <Link href={`/items/${i.id}`} className="text-brand hover:underline">
                      編集
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
