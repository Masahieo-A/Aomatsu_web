"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

interface PosEx {
  sentence: string;
  span: string;
}
interface NegEx {
  sentence: string;
  reason: string;
}
interface Item {
  id: string;
  name: string;
  name_en: string;
  status: string;
  level: string;
  parent_id: string | null;
  prerequisites: string[];
  criteria: string;
  patterns: string[];
  positive_examples: PosEx[];
  negative_examples: NegEx[];
  common_misconceptions: string[];
  probe_template: string;
  notes: string;
  test_results: { last_tested_at: string | null; accuracy: number | null; runs: number };
  created_at: string;
  updated_at: string;
  version: number;
}

const STATUSES = ["memo", "draft", "verified", "published", "deprecated"];
const LEVELS = ["A1", "A2", "B1", "B2", "C1"];

function blank(id: string): Item {
  const now = new Date().toISOString();
  return {
    id,
    name: "",
    name_en: "",
    status: "memo",
    level: "B1",
    parent_id: null,
    prerequisites: [],
    criteria: "",
    patterns: [],
    positive_examples: [],
    negative_examples: [],
    common_misconceptions: [],
    probe_template: "",
    notes: "",
    test_results: { last_tested_at: null, accuracy: null, runs: 0 },
    created_at: now,
    updated_at: now,
    version: 1,
  };
}

export default function ItemEditor({ id }: { id?: string }) {
  const router = useRouter();
  const [item, setItem] = useState<Item | null>(null);
  const [all, setAll] = useState<Item[]>([]);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const isNew = !id;

  useEffect(() => {
    (async () => {
      const r = await fetch("/api/items");
      const d = await r.json();
      setAll(d.items);
      if (id) {
        const found = d.items.find((i: Item) => i.id === id);
        setItem(found ?? blank(id));
      } else {
        let max = 0;
        for (const it of d.items as Item[]) {
          const m = it.id.match(/^G(\d+)$/);
          if (m) max = Math.max(max, Number(m[1]));
        }
        setItem(blank("G" + String(max + 1).padStart(3, "0")));
      }
    })();
  }, [id]);

  const availablePrereqs = useMemo(
    () => all.filter((i) => i.id !== item?.id),
    [all, item]
  );

  if (!item) return <main className="wrap">読込中…</main>;

  const patch = (p: Partial<Item>) => setItem({ ...item, ...p });

  async function save() {
    setMsg("");
    setErr("");
    const r = await fetch("/api/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item),
    });
    const d = await r.json();
    if (!r.ok) {
      setErr(d.error);
      return;
    }
    setMsg("保存しました");
    if (isNew) router.push(`/items/${item!.id}`);
  }

  async function remove() {
    if (!confirm("削除しますか？（memo/draftのみ物理削除可）")) return;
    const r = await fetch(`/api/items/${item!.id}`, { method: "DELETE" });
    const d = await r.json();
    if (!r.ok) return setErr(d.error);
    router.push("/");
  }

  function duplicate() {
    // E-04: 複製から新項目
    let max = 0;
    for (const it of all) {
      const m = it.id.match(/^G(\d+)$/);
      if (m) max = Math.max(max, Number(m[1]));
    }
    const newId = "G" + String(max + 1).padStart(3, "0");
    setItem({ ...item!, id: newId, status: "draft", name: item!.name + "（複製）", version: 1 });
    setMsg(`複製して新規ID ${newId} を割り当てました。保存すると新項目になります。`);
  }

  function captureSpan(idx: number) {
    const sel = window.getSelection()?.toString().trim();
    if (!sel) return;
    const pe = [...item!.positive_examples];
    pe[idx] = { ...pe[idx], span: sel };
    patch({ positive_examples: pe });
  }

  return (
    <main className="wrap space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">
          {isNew ? "新規項目" : `項目編集 ${item.id}`}{" "}
          <span className={`badge-${item.status} align-middle`}>{item.status}</span>
        </h1>
        <div className="flex gap-2">
          <button className="btn-ghost" onClick={duplicate}>
            複製
          </button>
          {!isNew && (
            <button className="btn-danger" onClick={remove}>
              削除
            </button>
          )}
          <button className="btn-primary" onClick={save}>
            保存
          </button>
        </div>
      </div>

      {err && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 whitespace-pre-wrap">{err}</div>}
      {msg && <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700">{msg}</div>}

      <div className="card grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="label">ID（変更不可）</label>
          <input className="input font-mono" value={item.id} readOnly />
        </div>
        <div>
          <label className="label">ステータス</label>
          <select className="input" value={item.status} onChange={(e) => patch({ status: e.target.value })}>
            {STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">名称（日本語）</label>
          <input className="input" value={item.name} onChange={(e) => patch({ name: e.target.value })} />
        </div>
        <div>
          <label className="label">名称（英語）</label>
          <input className="input" value={item.name_en} onChange={(e) => patch({ name_en: e.target.value })} />
        </div>
        <div>
          <label className="label">CEFRレベル</label>
          <select className="input" value={item.level} onChange={(e) => patch({ level: e.target.value })}>
            {LEVELS.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">親項目 parent_id（任意）</label>
          <select
            className="input"
            value={item.parent_id ?? ""}
            onChange={(e) => patch({ parent_id: e.target.value || null })}
          >
            <option value="">（なし）</option>
            {availablePrereqs.map((i) => (
              <option key={i.id} value={i.id}>
                {i.id} {i.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="card">
        <label className="label">判定基準 criteria（P-01 の few-shot に使用）</label>
        <textarea className="input" rows={2} value={item.criteria} onChange={(e) => patch({ criteria: e.target.value })} />
      </div>

      <ArrayField
        label="典型パターン patterns（1行1件）"
        values={item.patterns}
        onChange={(patterns) => patch({ patterns })}
      />

      {/* 陽性例 E-03 */}
      <div className="card space-y-2">
        <div className="flex items-center justify-between">
          <label className="label">陽性例 positive_examples（verified条件: 3件以上）</label>
          <button
            className="btn-ghost"
            onClick={() =>
              patch({ positive_examples: [...item.positive_examples, { sentence: "", span: "" }] })
            }
          >
            + 追加
          </button>
        </div>
        {item.positive_examples.map((e, idx) => (
          <div key={idx} className="rounded-lg bg-slate-50 p-2">
            <input
              className="input mb-1"
              placeholder="英文"
              value={e.sentence}
              onChange={(ev) => {
                const pe = [...item.positive_examples];
                pe[idx] = { ...pe[idx], sentence: ev.target.value };
                patch({ positive_examples: pe });
              }}
            />
            <div className="flex gap-2">
              <input
                className="input"
                placeholder="span（該当箇所）"
                value={e.span}
                onChange={(ev) => {
                  const pe = [...item.positive_examples];
                  pe[idx] = { ...pe[idx], span: ev.target.value };
                  patch({ positive_examples: pe });
                }}
              />
              <button className="btn-ghost whitespace-nowrap" onClick={() => captureSpan(idx)} title="上の英文で該当箇所を選択してから押す">
                選択→span
              </button>
              <button
                className="btn-danger"
                onClick={() => patch({ positive_examples: item.positive_examples.filter((_, i) => i !== idx) })}
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 陰性例 */}
      <div className="card space-y-2">
        <div className="flex items-center justify-between">
          <label className="label">陰性例 negative_examples（verified条件: 2件以上）</label>
          <button
            className="btn-ghost"
            onClick={() => patch({ negative_examples: [...item.negative_examples, { sentence: "", reason: "" }] })}
          >
            + 追加
          </button>
        </div>
        {item.negative_examples.map((e, idx) => (
          <div key={idx} className="rounded-lg bg-slate-50 p-2 space-y-1">
            <input
              className="input"
              placeholder="英文（該当しない例）"
              value={e.sentence}
              onChange={(ev) => {
                const ne = [...item.negative_examples];
                ne[idx] = { ...ne[idx], sentence: ev.target.value };
                patch({ negative_examples: ne });
              }}
            />
            <div className="flex gap-2">
              <input
                className="input"
                placeholder="該当しない理由"
                value={e.reason}
                onChange={(ev) => {
                  const ne = [...item.negative_examples];
                  ne[idx] = { ...ne[idx], reason: ev.target.value };
                  patch({ negative_examples: ne });
                }}
              />
              <button
                className="btn-danger"
                onClick={() => patch({ negative_examples: item.negative_examples.filter((_, i) => i !== idx) })}
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>

      <ArrayField
        label="よくある誤解 common_misconceptions（1行1件）"
        values={item.common_misconceptions}
        onChange={(common_misconceptions) => patch({ common_misconceptions })}
      />

      <div className="card">
        <label className="label">プローブ雛形 probe_template（P-02 の生成制約）</label>
        <textarea className="input" rows={2} value={item.probe_template} onChange={(e) => patch({ probe_template: e.target.value })} />
      </div>

      {/* prerequisites */}
      <div className="card">
        <label className="label">前提項目 prerequisites（DAG・循環は保存時に拒否）</label>
        <div className="flex flex-wrap gap-2">
          {availablePrereqs.map((i) => {
            const on = item.prerequisites.includes(i.id);
            return (
              <button
                key={i.id}
                onClick={() =>
                  patch({
                    prerequisites: on
                      ? item.prerequisites.filter((p) => p !== i.id)
                      : [...item.prerequisites, i.id],
                  })
                }
                className={`rounded-full px-2 py-1 text-xs ring-1 ${
                  on ? "bg-brand text-white ring-brand" : "bg-white text-slate-500 ring-slate-200"
                }`}
              >
                {i.id} {i.name}
              </button>
            );
          })}
        </div>
      </div>

      <div className="card">
        <label className="label">メモ notes</label>
        <textarea className="input" rows={2} value={item.notes} onChange={(e) => patch({ notes: e.target.value })} />
      </div>

      <div className="card text-xs text-slate-500">
        <p>
          テスト結果:{" "}
          {item.test_results.accuracy != null
            ? `正答率 ${Math.round(item.test_results.accuracy * 100)}% / ${item.test_results.runs}回`
            : "未実施"}{" "}
          — <a className="text-brand underline" href={`/testbench?item=${item.id}`}>テストベンチで検証</a>
        </p>
        <p className="mt-1">version {item.version} / 更新 {item.updated_at}</p>
      </div>
    </main>
  );
}

function ArrayField({
  label,
  values,
  onChange,
}: {
  label: string;
  values: string[];
  onChange: (v: string[]) => void;
}) {
  return (
    <div className="card">
      <label className="label">{label}</label>
      <textarea
        className="input"
        rows={Math.max(2, values.length)}
        value={values.join("\n")}
        onChange={(e) => onChange(e.target.value.split("\n").filter((s) => s.trim() !== ""))}
      />
    </div>
  );
}
