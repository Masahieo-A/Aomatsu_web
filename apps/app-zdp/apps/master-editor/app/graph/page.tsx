"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface Item {
  id: string;
  name: string;
  status: string;
  prerequisites: string[];
}

export default function GraphPage() {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [target, setTarget] = useState("");
  const [err, setErr] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const r = await fetch("/api/items");
      const d = await r.json();
      setItems(d.items);
    })();
  }, []);

  // 学習経路（G-04）: target に至る前提の連鎖
  function pathTo(id: string, byId: Map<string, Item>): Set<string> {
    const set = new Set<string>();
    const visit = (x: string) => {
      const it = byId.get(x);
      if (!it) return;
      for (const p of it.prerequisites) {
        if (!set.has(p)) {
          set.add(p);
          visit(p);
        }
      }
    };
    visit(id);
    return set;
  }

  useEffect(() => {
    if (items.length === 0) return;
    const byId = new Map(items.map((i) => [i.id, i]));
    const highlight = target ? pathTo(target, byId) : new Set<string>();
    if (target) highlight.add(target);

    const lines: string[] = ["graph LR"];
    for (const it of items) {
      const label = `${it.id}<br/>${it.name.replace(/"/g, "'").slice(0, 14)}`;
      lines.push(`${it.id}["${label}"]`);
      for (const p of it.prerequisites) {
        lines.push(`${p} --> ${it.id}`);
      }
    }
    // スタイル: ステータス色 + ハイライト
    for (const it of items) {
      const color =
        it.status === "published"
          ? "#dcfce7"
          : it.status === "verified"
          ? "#dbeafe"
          : it.status === "draft"
          ? "#fef3c7"
          : it.status === "deprecated"
          ? "#fee2e2"
          : "#f1f5f9";
      const stroke = highlight.has(it.id) ? "#0f766e" : "#cbd5e1";
      const sw = highlight.has(it.id) ? "3px" : "1px";
      lines.push(`style ${it.id} fill:${color},stroke:${stroke},stroke-width:${sw}`);
    }
    const def = lines.join("\n");

    (async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({ startOnLoad: false, theme: "neutral" });
        const { svg } = await mermaid.render("gm" + Date.now(), def);
        if (ref.current) {
          ref.current.innerHTML = svg;
          // クリックでエディタへ（G-01）
          ref.current.querySelectorAll(".node").forEach((node) => {
            (node as HTMLElement).style.cursor = "pointer";
            node.addEventListener("click", () => {
              const text = node.textContent || "";
              const m = text.match(/G\d{3,}/);
              if (m) router.push(`/items/${m[0]}`);
            });
          });
        }
      } catch (e) {
        setErr((e as Error).message);
      }
    })();
  }, [items, target, router]);

  // G-03: 孤立項目（前提を持たず、どこからも参照されない）
  const referencedAsPrereq = new Set(items.flatMap((i) => i.prerequisites));
  const orphans = items.filter(
    (i) => i.prerequisites.length === 0 && !referencedAsPrereq.has(i.id)
  );

  return (
    <main className="wrap space-y-4">
      <h1 className="text-lg font-bold">前提項目グラフ</h1>

      <div className="card flex flex-wrap items-center gap-3">
        <label className="text-sm">学習経路をハイライト（G-04）:</label>
        <select className="input w-auto" value={target} onChange={(e) => setTarget(e.target.value)}>
          <option value="">（なし）</option>
          {items.map((i) => (
            <option key={i.id} value={i.id}>
              {i.id} {i.name}
            </option>
          ))}
        </select>
        <span className="text-xs text-slate-400">ノードをクリックすると編集画面へ遷移します</span>
      </div>

      {err && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">Mermaid: {err}</div>}

      <div className="card overflow-x-auto">
        <div ref={ref} className="min-h-[200px]" />
      </div>

      <div className="card">
        <h2 className="mb-2 text-sm font-semibold">
          孤立項目（G-03・グラフの穴の発見）: {orphans.length}件
        </h2>
        {orphans.length === 0 ? (
          <p className="text-sm text-slate-400">なし</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {orphans.map((o) => (
              <li key={o.id}>
                <a href={`/items/${o.id}`} className="badge bg-slate-100 text-slate-600 hover:bg-slate-200">
                  {o.id} {o.name}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
