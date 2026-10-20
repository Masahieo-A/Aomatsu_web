"use client";
// S6 Stance Check: 立場の再表明と前後の差
import Link from "next/link";
import { useState } from "react";
import RequireStudent from "@/components/RequireStudent";
import SideBadge from "@/components/SideBadge";
import StanceMeter, { stanceText } from "@/components/StanceMeter";
import { mySide } from "@/lib/progress";
import { useStudent } from "@/lib/store";
import type { StudentState } from "@/lib/types";

export default function StancePage() {
  return <RequireStudent>{(s) => <Stance s={s} />}</RequireStudent>;
}

function diffText(before: number | undefined, after: number | undefined): string {
  if (before === undefined || after === undefined) return "";
  const d = after - before;
  if (d === 0) return "最初と同じ立場です。";
  return `${Math.abs(d)}段階 ${d > 0 ? "制限側" : "広める側"}へ動きました。`;
}

function Stance({ s }: { s: StudentState }) {
  const { update } = useStudent();
  const [value, setValue] = useState<number | undefined>(s.stanceAfter);
  const [reason, setReason] = useState(s.stanceReason ?? "");
  const [saved, setSaved] = useState(s.stanceAfter !== undefined);

  const sideBefore = mySide({ ...s, stanceAfter: undefined });
  const sideAfter = mySide({ ...s, stanceAfter: value });

  const save = () => {
    if (value === undefined) return;
    const r = reason.trim().slice(0, 200);
    update((cur) => ({ ...cur, stanceAfter: value, stanceReason: r }));
    setSaved(true);
  };

  return (
    <div className="page space-y-6">
      <header>
        <h1 className="page-title">Stance Check（立場の確認）</h1>
        <p className="muted">記事を読んだ後の立場を選び、最初の立場とどう変わったかを確かめます。</p>
      </header>

      <section className="box space-y-3">
        <p className="text-sm">
          <span className="font-semibold">Before（最初の立場）：</span>
          {stanceText(s.stanceBefore)}
        </p>
        <p className="font-semibold">
          After（今の立場）：<span className="font-normal">記事を読んだ今、どう考えますか。</span>
        </p>
        <StanceMeter
          name="after"
          value={value}
          onChange={(v) => {
            setValue(v);
            setSaved(false);
          }}
        />
        {value !== undefined && <p className="font-semibold">{diffText(s.stanceBefore, value)}</p>}
        {sideAfter && sideBefore && sideAfter !== sideBefore && (
          <p className="flex flex-wrap items-center gap-2 text-sm">
            自分の側が <SideBadge side={sideAfter} /> に変わります。
          </p>
        )}
        <div>
          <label className="field-label" htmlFor="reason">
            Reason（理由）：立場が変わった／変わらなかった理由（任意・1文）
          </label>
          <input
            id="reason"
            className="field"
            maxLength={200}
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              setSaved(false);
            }}
          />
        </div>
        <button className="btn" disabled={value === undefined || saved} onClick={save}>
          {saved ? "✓ 保存済み" : "保存する"}
        </button>
      </section>

      <Link href="/" className="btn-secondary">
        記事一覧に戻る
      </Link>
    </div>
  );
}
