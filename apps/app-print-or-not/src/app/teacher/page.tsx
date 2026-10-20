"use client";
// T1 教員画面。パスコードは sessionStorage にだけ置く（タブを閉じれば消える）。
import { useCallback, useEffect, useState } from "react";
import Dashboard from "@/components/teacher/Dashboard";
import LoginForm from "@/components/teacher/LoginForm";
import { PASSCODE_KEY } from "@/components/teacher/teacher-api";

export default function TeacherPage() {
  const [ready, setReady] = useState(false);
  const [passcode, setPasscode] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    // sessionStorage はブラウザでしか読めないため、マウント後に読み込む
    try {
      const saved = sessionStorage.getItem(PASSCODE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved) setPasscode(saved);
    } catch {}
    setReady(true);
  }, []);

  const logout = useCallback((message = "") => {
    try {
      sessionStorage.removeItem(PASSCODE_KEY);
    } catch {}
    setPasscode(null);
    setError(message);
  }, []);

  function login(value: string) {
    try {
      sessionStorage.setItem(PASSCODE_KEY, value);
    } catch {}
    setError("");
    setPasscode(value);
  }

  return (
    <div className="page">
      <h1 className="page-title">教員用</h1>
      {!ready ? (
        <p className="muted">読み込み中…</p>
      ) : passcode ? (
        <Dashboard passcode={passcode} onLogout={() => logout()} onAuthFail={logout} />
      ) : (
        <LoginForm error={error} onSubmit={login} />
      )}
    </div>
  );
}
