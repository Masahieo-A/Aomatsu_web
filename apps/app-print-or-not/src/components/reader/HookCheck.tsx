"use client";
// Hook（導入）の True/False 問題のうち、この記事に対応するものの答え合わせ。
import { useStudent } from "@/lib/store";
import hookJson from "@/data/hook.json";

interface HookTF {
  id: string;
  statement: string;
  answer: boolean;
  articleId?: string;
  explain: string;
}

const TF = (hookJson as unknown as { trueFalse: HookTF[] }).trueFalse;

// Hook 画面側の保存形式が違っても読めるよう、よくある表記を許容する
function toBool(v: string | undefined): boolean | undefined {
  if (v === undefined) return undefined;
  const t = v.trim().toLowerCase();
  if (["true", "t", "yes", "○", "〇", "o"].includes(t)) return true;
  if (["false", "f", "no", "×", "x"].includes(t)) return false;
  return undefined;
}

const label = (b: boolean | undefined) => (b === undefined ? "未回答" : b ? "True" : "False");

export default function HookCheck({ articleId }: { articleId: string }) {
  const { state } = useStudent();
  const qs = TF.filter((q) => q.articleId === articleId);
  if (qs.length === 0 || !state) return null;
  return (
    <section className="box my-6">
      <h2 className="section-title">Hook の問題</h2>
      <ul className="space-y-4">
        {qs.map((q) => {
          const mine = toBool(state.hookAnswers[q.id]);
          return (
            <li key={q.id}>
              <p className="mb-1">{q.statement}</p>
              <p className="text-sm">
                あなたの答え：<b>{label(mine)}</b>
                {mine !== undefined && <b className="ml-2">{mine === q.answer ? "✓ 正解" : "✗ 不正解"}</b>}
              </p>
              <p className="text-sm">
                正解：<b>{label(q.answer)}</b>
                <span className="ml-1">{q.explain}</span>
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
