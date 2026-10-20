"use client";
// 表現集。クリックで本文のカーソル位置に挿入する（挿入の実処理は親が持つ）。
import expressions from "@/data/expressions.json";

interface Group {
  category: string;
  items: string[];
}

const GROUPS = expressions as Group[];
const VOCAB = "テーマ語彙";

// テーマ語彙は「swallow 飲み込む」の形。本文に入れるのは英語部分だけ。
function insertText(category: string, item: string): string {
  if (category !== VOCAB) return item;
  const m = item.match(/^[\x20-\x7e]+/);
  return (m ? m[0] : item).trim();
}

export default function ExpressionPanel({ onInsert }: { onInsert: (text: string) => void }) {
  return (
    <div className="space-y-4">
      {GROUPS.map((g) => (
        <section key={g.category}>
          <h3 className="mb-1 text-sm font-bold">{g.category}</h3>
          <ul className="space-y-1">
            {g.items.map((item) => (
              <li key={item}>
                <button
                  type="button"
                  // ボタンを押してもテキスト欄のカーソル位置が動かないようにする
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => onInsert(insertText(g.category, item))}
                  className="min-h-11 w-full rounded-md border border-line bg-white px-3 py-2 text-left text-sm hover:border-accent-light"
                >
                  {item}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
