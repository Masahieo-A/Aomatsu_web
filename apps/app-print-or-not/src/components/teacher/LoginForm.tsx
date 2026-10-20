"use client";
import { useState } from "react";

export default function LoginForm({ error, onSubmit }: { error: string; onSubmit: (passcode: string) => void }) {
  const [value, setValue] = useState("");
  return (
    <form
      className="box space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (value) onSubmit(value);
      }}
    >
      <label className="field-label" htmlFor="passcode">
        パスコード
      </label>
      <input
        id="passcode"
        type="password"
        autoComplete="off"
        className="field"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      {error && (
        <p className="error-text" role="alert">
          {error}
        </p>
      )}
      <button type="submit" className="btn" disabled={!value}>
        開く
      </button>
      <p className="muted">パスコードはこのタブを閉じると消えます。</p>
    </form>
  );
}
