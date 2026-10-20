"use client";
import { useState } from "react";
import type { Settings } from "@/lib/types";
import { isAuthFailure, teacherPost } from "./teacher-api";

export default function SettingsForm({
  settings,
  passcode,
  onSaved,
  onAuthFail,
}: {
  settings: Settings;
  passcode: string;
  onSaved: (s: Settings) => void;
  onAuthFail: (message: string) => void;
}) {
  const [classes, setClasses] = useState(settings.classes.join(", "));
  const [soWhatJa, setSoWhatJa] = useState(settings.soWhatJaAllowed);
  const [wordMin, setWordMin] = useState(String(settings.wordMin));
  const [wordMax, setWordMax] = useState(String(settings.wordMax));
  const [trap, setTrap] = useState(settings.trapRequired);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    setMessage(null);
    const next: Settings = {
      classes: classes.split(/[\s,、]+/).filter(Boolean),
      soWhatJaAllowed: soWhatJa,
      wordMin: Number(wordMin),
      wordMax: Number(wordMax),
      trapRequired: trap,
    };
    const { status, result } = await teacherPost<Settings>("settings", passcode, { settings: next });
    setBusy(false);
    if (isAuthFailure(status)) return onAuthFail(result.error ?? "認証できませんでした");
    if (result.ok && result.data) {
      onSaved(result.data);
      setMessage({ text: "保存しました。生徒の画面には次回の読み込みから反映されます。", error: false });
    } else {
      setMessage({ text: result.error ?? "保存できませんでした", error: true });
    }
  }

  return (
    <div className="box space-y-4">
      <div>
        <label className="field-label" htmlFor="set-classes">
          クラス一覧（カンマ区切り、例: 3-1, 3-2）
        </label>
        <input id="set-classes" className="field" value={classes} onChange={(e) => setClasses(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="field-label" htmlFor="set-min">
            目標語数（最小）
          </label>
          <input id="set-min" type="number" inputMode="numeric" className="field" value={wordMin} onChange={(e) => setWordMin(e.target.value)} />
        </div>
        <div>
          <label className="field-label" htmlFor="set-max">
            目標語数（最大）
          </label>
          <input id="set-max" type="number" inputMode="numeric" className="field" value={wordMax} onChange={(e) => setWordMax(e.target.value)} />
        </div>
      </div>
      <label className="flex min-h-11 items-center gap-3 text-sm">
        <input type="checkbox" className="h-5 w-5" checked={soWhatJa} onChange={(e) => setSoWhatJa(e.target.checked)} />
        So what を日本語でも可にする
      </label>
      <label className="flex min-h-11 items-center gap-3 text-sm">
        <input type="checkbox" className="h-5 w-5" checked={trap} onChange={(e) => setTrap(e.target.checked)} />
        Trap or Treasure を Writing Builder の必須条件にする
      </label>
      {message && (
        <p className={message.error ? "error-text" : "text-sm font-semibold text-accent"} role="status">
          {message.error ? "" : "✓ "}
          {message.text}
        </p>
      )}
      <button type="button" className="btn" onClick={save} disabled={busy}>
        設定を保存
      </button>
    </div>
  );
}
