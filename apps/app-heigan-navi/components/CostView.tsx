"use client";

import { isEnrollFeePrepaid } from "@/lib/schedule";
import { ExamMethod } from "@/lib/types";
import { Badge } from "./Badge";

export default function CostView({
  baseMethod,
  candidates,
}: {
  baseMethod: ExamMethod;
  candidates: ExamMethod[];
}) {
  const all = [baseMethod, ...candidates];
  const total = all.reduce((sum, m) => sum + (m.fee ?? 0), 0);

  return (
    <div className="rounded-lg border border-zinc-300 bg-white p-3">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-200 text-left text-zinc-500">
            <th className="py-1">大学 / 方式</th>
            <th className="py-1">検定料</th>
            <th className="py-1">注記</th>
            <th className="py-1">入学金先払い</th>
          </tr>
        </thead>
        <tbody>
          {all.map((m) => {
            const prepaid = m.id !== baseMethod.id && isEnrollFeePrepaid(baseMethod, m);
            return (
              <tr key={m.id} className="border-b border-zinc-100">
                <td className="py-1">
                  {m.university} {m.methodName}
                  {m.id === baseMethod.id && <span className="ml-1 text-xs text-blue-600">(基準)</span>}
                </td>
                <td className="py-1">{m.fee ? `${m.fee.toLocaleString()}円` : "不明"}</td>
                <td className="py-1 text-xs text-zinc-500">{m.feeNote ?? ""}</td>
                <td className="py-1">
                  {prepaid && <Badge color="red">入学金先払い発生</Badge>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="mt-2 text-right text-sm font-medium">検定料合計：{total.toLocaleString()}円</p>
    </div>
  );
}
