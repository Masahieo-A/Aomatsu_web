"use client";

import { useEffect, useState } from "react";

interface Meta {
  schema_version: string;
  total: number;
  published: number;
  source: string;
  loadedAt: string;
  deprecated_ids: string[];
}

export default function TeacherPage() {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  async function loadMeta() {
    const r = await fetch("/api/master");
    if (r.ok) setMeta(await r.json());
  }
  useEffect(() => {
    loadMeta();
  }, []);

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    setMsg("");
    setErr("");
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const json = JSON.parse(await file.text());
      const res = await fetch("/api/master", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(json),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMsg(
        `差し替え完了: ${data.total}項目（published ${data.published}）v${data.schema_version}`
      );
      await loadMeta();
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  return (
    <main className="container-mobile space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-brand">先生用ページ</h1>
        <a href="/" className="text-xs underline text-slate-400">
          生徒画面へ
        </a>
      </header>

      <div className="card space-y-2 text-sm">
        <p className="font-medium">現在の文法項目マスタ</p>
        {meta ? (
          <ul className="space-y-1 text-slate-600">
            <li>スキーマ: v{meta.schema_version}</li>
            <li>
              総項目数: {meta.total}（published {meta.published}）
            </li>
            <li>読込元: {meta.source}</li>
            <li className="text-xs text-slate-400">更新: {meta.loadedAt}</li>
          </ul>
        ) : (
          <p className="text-slate-400">読込中…</p>
        )}
      </div>

      <div className="card space-y-3 text-sm">
        <p className="font-medium">grammar_master.json をアップロード（T-02）</p>
        <p className="text-xs text-slate-400">
          マスタアプリからエクスポートした published のみのJSONを選択してください。
          スキーマ検証とバージョン照合を通過した場合のみ差し替わります。
        </p>
        <input
          type="file"
          accept="application/json,.json"
          onChange={onUpload}
          className="text-sm"
        />
        {msg && <p className="text-green-700">{msg}</p>}
        {err && <p className="text-red-600">{err}</p>}
      </div>
    </main>
  );
}
