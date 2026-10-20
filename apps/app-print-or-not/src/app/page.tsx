"use client";
// S0 Start: クラスと出席番号だけを入力する（氏名・メールは扱わない）
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useStudent } from "@/lib/store";

export default function StartPage() {
  const { ready, state, settings, start, signOut } = useStudent();
  const router = useRouter();
  const [classId, setClassId] = useState("");
  const [num, setNum] = useState("");
  const [error, setError] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const n = Number(num);
    if (!settings.classes.includes(classId)) return setError("クラスを選んでください。");
    if (!Number.isInteger(n) || n < 1 || n > 60) return setError("出席番号は 1〜60 の数字で入力してください。");
    start(classId, n);
    router.push("/hook");
  };

  if (!ready) return <div className="page muted">読み込み中…</div>;

  return (
    <div className="page">
      <h1 className="page-title">PRINT or NOT?</h1>
      <div className="box mb-6">
        <p className="font-semibold">Should 3D-printed food become more widespread, or should it be restricted?</p>
        <p className="mt-2 text-sm">
          3D-printed food = food made by a machine that puts soft food (paste) layer by layer to make a shape.
        </p>
      </div>

      {state ? (
        <div className="box">
          <p>
            {state.classId}・{state.number}番 で続きから始めます。
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button className="btn" onClick={() => router.push(state.hookDone ? "/map" : "/hook")}>
              続きから
            </button>
            <button
              className="btn-secondary"
              onClick={() => {
                if (confirm("この端末の作業記録を消して、別の番号で始めますか？")) signOut();
              }}
            >
              別の番号で始める
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="box space-y-4">
          <div>
            <label className="field-label" htmlFor="class">
              クラス
            </label>
            <select id="class" className="field" value={classId} onChange={(e) => setClassId(e.target.value)}>
              <option value="">選んでください</option>
              {settings.classes.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label" htmlFor="num">
              出席番号
            </label>
            <input
              id="num"
              className="field"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={2}
              value={num}
              onChange={(e) => setNum(e.target.value.replace(/\D/g, ""))}
            />
            <p className="muted mt-1">名前は入力しません。</p>
          </div>
          {error && <p className="error-text">{error}</p>}
          <button type="submit" className="btn w-full">
            始める
          </button>
        </form>
      )}
    </div>
  );
}
