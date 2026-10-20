"use client";
import { useState } from "react";
import { isAuthFailure, teacherPost } from "./teacher-api";

interface PurgeData {
  students: number;
  cards: number;
  hints: number;
}

export default function PurgePanel({
  passcode,
  onPurged,
  onAuthFail,
}: {
  passcode: string;
  onPurged: () => void;
  onAuthFail: (message: string) => void;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  async function purge() {
    setBusy(true);
    setMessage(null);
    const { status, result } = await teacherPost<PurgeData>("purge", passcode, { confirm: text });
    setBusy(false);
    if (isAuthFailure(status)) return onAuthFail(result.error ?? "認証できませんでした");
    if (result.ok && result.data) {
      setText("");
      setMessage({
        text: `削除しました（生徒 ${result.data.students} 人・Card ${result.data.cards} 枚・ヒント ${result.data.hints} 件）`,
        error: false,
      });
      onPurged();
    } else {
      setMessage({ text: result.error ?? "削除できませんでした", error: true });
    }
  }

  return (
    <div className="box space-y-3">
      <p className="text-sm">
        全クラスの生徒データ（立場・Card・ヒント記録）をすべて削除します。元に戻せません。先に CSV を保存してください。設定は残ります。
      </p>
      <div>
        <label className="field-label" htmlFor="purge-confirm">
          確認のため DELETE と入力
        </label>
        <input id="purge-confirm" className="field" autoComplete="off" value={text} onChange={(e) => setText(e.target.value)} />
      </div>
      {message && (
        <p className={message.error ? "error-text" : "text-sm font-semibold text-accent"} role="status">
          {message.error ? "" : "✓ "}
          {message.text}
        </p>
      )}
      <button type="button" className="btn-secondary !border-red-700 !text-red-700" disabled={text !== "DELETE" || busy} onClick={purge}>
        全生徒データを削除
      </button>
    </div>
  );
}
