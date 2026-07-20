"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * クイックメモ（E-02）。授業中にスマホから最速で status:memo を登録する。
 * 名称と notes だけ入れれば保存でき、後日PCで清書する。
 */
export default function MemoPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [level, setLevel] = useState("B1");
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState("");
  const [err, setErr] = useState("");

  async function save() {
    setSaving(true);
    setErr("");
    try {
      // 次IDを取得
      const items = (await (await fetch("/api/items")).json()).items as { id: string }[];
      let max = 0;
      for (const it of items) {
        const m = it.id.match(/^G(\d+)$/);
        if (m) max = Math.max(max, Number(m[1]));
      }
      const id = "G" + String(max + 1).padStart(3, "0");

      const now = new Date().toISOString();
      const item = {
        id,
        name: name || "（メモ）",
        name_en: "",
        status: "memo",
        level,
        parent_id: null,
        prerequisites: [],
        criteria: "",
        patterns: [],
        positive_examples: [],
        negative_examples: [],
        common_misconceptions: [],
        probe_template: "",
        notes,
        test_results: { last_tested_at: null, accuracy: null, runs: 0 },
        created_at: now,
        updated_at: now,
        version: 1,
      };
      const r = await fetch("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setSavedId(id);
      setName("");
      setNotes("");
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="wrap max-w-md space-y-4">
      <h1 className="text-lg font-bold">クイックメモ</h1>
      <p className="text-xs text-slate-500">
        授業・添削中に気づいた躓きを30秒で記録（status: memo）。後日PCで清書します。
      </p>

      <div className="card space-y-3">
        <div>
          <label className="label">項目名（仮でOK）</label>
          <input
            className="input"
            placeholder="例: that節の中の時制のずれ"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <label className="label">気づいたこと（notes）</label>
          <textarea
            className="input"
            rows={4}
            placeholder="例: She said that she was... の was を過去の話と誤読する生徒が3人"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
        <div>
          <label className="label">想定レベル</label>
          <select className="input" value={level} onChange={(e) => setLevel(e.target.value)}>
            {["A1", "A2", "B1", "B2", "C1"].map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
        </div>
        <button className="btn-primary w-full" onClick={save} disabled={saving || (!name && !notes)}>
          {saving ? "保存中…" : "メモを保存"}
        </button>
      </div>

      {err && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{err}</div>}
      {savedId && (
        <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
          {savedId} として保存しました。{" "}
          <button className="underline" onClick={() => router.push(`/items/${savedId}`)}>
            清書する
          </button>
        </div>
      )}
    </main>
  );
}
