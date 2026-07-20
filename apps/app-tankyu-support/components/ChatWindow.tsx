"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ChatMessage } from "@/types";
import { InputArea } from "@/components/InputArea";
import { MessageBubble } from "@/components/MessageBubble";
import { isLensLabel } from "@/lib/inquiryConstants";
import { INTERSECTION_STORAGE_KEY } from "@/lib/intersectionSession";

/** API と同じ JSON 封筒（version + blocks）。パーサが一意に解釈する。 */
const INITIAL_ASSISTANT_MESSAGE: ChatMessage = {
  role: "model",
  content: JSON.stringify({
    version: 1,
    blocks: [
      {
        kind: "markdown",
        content:
          "このアプリは、君の「地域探究の問い」を作るための相棒です。\n\nここでできることは3つ。\n(1) 気になる分野を選ぶ\n(2) 視点カードを選んで、問いのタネを見つける\n(3) 調べられる形の問いに仕上げる\n\nまずは、気になる分野を1つタップしてね。"
      },
      {
        kind: "options",
        options: [
          { label: "福祉", sendValue: "福祉" },
          { label: "健康", sendValue: "健康" },
          { label: "労働", sendValue: "労働" },
          { label: "教育", sendValue: "教育" },
          { label: "環境", sendValue: "環境" },
          { label: "食", sendValue: "食" },
          { label: "情報", sendValue: "情報" },
          { label: "伝統文化", sendValue: "伝統文化" },
          { label: "経済", sendValue: "経済" }
        ]
      }
    ]
  })
};

export function ChatWindow() {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_ASSISTANT_MESSAGE]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const allMessages = useMemo(() => {
    if (streamingText == null) return messages;
    // 受信完了まで中身が空のときは空吹き出しを出さない（JSON一括取得モード）
    if (streamingText === "") return messages;
    return [...messages, { role: "model" as const, content: streamingText }];
  }, [messages, streamingText]);

  async function send(overrideText?: string) {
    const text = (overrideText ?? input).trim();
    if (!text || isStreaming) return;

    setInput("");
    setStreamingText("");
    setIsStreaming(true);

    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages })
      });

      if (!res.ok || !res.body) {
        throw new Error("bad_response");
      }

      const acc = await res.text();
      setMessages((prev) => [...prev, { role: "model", content: acc }]);
      setStreamingText(null);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "model", content: "エラーが発生しました。もう一度試してください。" }
      ]);
      setStreamingText(null);
    } finally {
      setIsStreaming(false);
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }

  function reset() {
    setMessages([INITIAL_ASSISTANT_MESSAGE]);
    setInput("");
    setIsStreaming(false);
    setStreamingText(null);
  }

  return (
    <div className="flex min-h-[calc(100dvh-52px-2rem)] flex-col gap-4 sm:min-h-[calc(100dvh-52px-4rem)]">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-[#1a1714]">探究ファシリテーターAI</h1>
          <p className="text-sm text-[#6b645c]">
            君の「問い」を作るところまで、一緒に走ります。
          </p>
        </div>
        <div className="shrink-0">
          <button
            type="button"
            disabled={isStreaming}
            onClick={() => {
              const ok = window.confirm("会話を最初からやり直します。よろしいですか？");
              if (ok) reset();
            }}
            className="rounded-lg border border-[#e2ddd8] bg-white px-3 py-2 text-[14px] font-semibold text-[#1a1714] shadow-sm transition hover:bg-[#f8f7f4] disabled:opacity-50"
          >
            最初からやり直す
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto rounded-[10px] border border-[#e2ddd8] bg-[#f8f7f4]/50 p-3 shadow-sm sm:p-4">
        <div className="flex flex-col gap-3">
          {allMessages.map((m, idx) => {
            const isLatest = idx === allMessages.length - 1;
            const canInteract = !isStreaming && isLatest && m.role === "model" && streamingText == null;
            return (
              <MessageBubble
                key={idx}
                message={m}
                disabled={!canInteract}
                onPickOption={
                  canInteract
                    ? (v) => {
                        if (isLensLabel(v)) {
                          const nextMessages: ChatMessage[] = [
                            ...messages,
                            { role: "user", content: v.trim() }
                          ];
                          sessionStorage.setItem(
                            INTERSECTION_STORAGE_KEY,
                            JSON.stringify({ messages: nextMessages })
                          );
                          router.push("/intersection");
                          return;
                        }
                        void send(v);
                      }
                    : undefined
                }
              />
            );
          })}
          {isStreaming ? (
            <div className="text-sm text-[#6b645c]">AIが考えています...</div>
          ) : null}
          <div ref={bottomRef} />
        </div>
      </main>

      <footer className="sticky bottom-0 bg-[#f8f7f4] pb-2">
        <InputArea
          value={input}
          onChange={setInput}
          onSend={() => void send()}
          disabled={isStreaming}
        />
        <div className="mt-2 text-xs text-[#6b645c]">
          Enterで送信、Shift+Enterで改行。会話は保存されません（ページを閉じるとリセット）。
        </div>
      </footer>
    </div>
  );
}

