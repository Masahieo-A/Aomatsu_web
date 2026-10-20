"use client";
// F3-8 ブラウザの読み上げ（TTS）。非対応ブラウザではボタン自体を出さない。
import { useEffect, useState, useSyncExternalStore } from "react";
import { splitSentences } from "@/lib/text";

const noopSubscribe = () => () => {};

export default function ReadAloud({ paragraphs }: { paragraphs: string[] }) {
  // SSR と初回描画の不一致を避けるため useSyncExternalStore で対応可否を取る
  const supported = useSyncExternalStore(
    noopSubscribe,
    () => "speechSynthesis" in window,
    () => false,
  );
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    return () => {
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, []);

  if (!supported) return null;

  const stop = () => {
    window.speechSynthesis.cancel();
    setSpeaking(false);
  };

  const start = () => {
    window.speechSynthesis.cancel();
    // 長い文をまとめて読むと途中で止まる端末があるため、文ごとに分けて順に読む
    const sentences = paragraphs
      .flatMap((p) => splitSentences(p))
      .filter((x) => x.trim());
    if (sentences.length === 0) return;
    sentences.forEach((sent, i) => {
      const u = new SpeechSynthesisUtterance(sent);
      u.lang = "en-US";
      if (i === sentences.length - 1) {
        u.onend = () => setSpeaking(false);
        u.onerror = () => setSpeaking(false);
      }
      window.speechSynthesis.speak(u);
    });
    setSpeaking(true);
  };

  return (
    <button
      type="button"
      className="btn-secondary"
      onClick={speaking ? stop : start}
      aria-pressed={speaking}
    >
      {speaking ? "■ 読み上げを止める" : "▶ 読み上げ（Lv1）"}
    </button>
  );
}
