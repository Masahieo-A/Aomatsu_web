"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ChatMessage } from "@/types";
import { parseGeminiResponse } from "@/lib/parseGeminiResponse";
import { OptionGrid } from "@/components/OptionGrid";
import { StepCards } from "@/components/StepCards";
import { ThemeCards } from "@/components/ThemeCards";
import { PerspectiveCards } from "@/components/PerspectiveCards";
import { LensPicker } from "@/components/LensPicker";

function clsx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

export function MessageBubble({
  message,
  onPickOption,
  disabled
}: {
  message: ChatMessage;
  onPickOption?: (sendValue: string) => void;
  disabled?: boolean;
}) {
  const isUser = message.role === "user";
  const blocks = !isUser ? parseGeminiResponse(message.content) : null;

  return (
    <div className={clsx("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={clsx(
          isUser
            ? "max-w-[92%] rounded-[10px] bg-[#2d6a4f] px-4 py-3 text-[16px] leading-relaxed text-white shadow-sm"
            : "w-full"
        )}
      >
        {isUser ? (
          <div className="whitespace-pre-wrap break-words">{message.content}</div>
        ) : (
          <div className="prose prose-slate max-w-none prose-p:my-2 prose-ul:my-2 prose-ol:my-2">
            {blocks?.map((b, idx) => {
              if (b.type === "options") {
                return (
                  <div key={idx} className="not-prose">
                    <OptionGrid
                      title={b.title}
                      options={b.options}
                      onPick={(v) => onPickOption?.(v)}
                      disabled={Boolean(disabled) || !onPickOption}
                    />
                  </div>
                );
              }
              if (b.type === "lensPicker") {
                return (
                  <div key={idx} className="not-prose">
                    <LensPicker
                      title={b.title}
                      lenses={b.lenses}
                      onPick={(v) => onPickOption?.(v)}
                      disabled={Boolean(disabled) || !onPickOption}
                    />
                  </div>
                );
              }
              if (b.type === "sections") {
                return (
                  <div key={idx} className="not-prose">
                    <PerspectiveCards
                      title={b.title}
                      sections={b.sections}
                      onPick={(v) => onPickOption?.(v)}
                      disabled={Boolean(disabled) || !onPickOption}
                    />
                  </div>
                );
              }
              if (b.type === "steps") {
                return (
                  <div key={idx} className="not-prose">
                    <StepCards title={b.title} steps={b.steps} />
                  </div>
                );
              }
              if (b.type === "themes") {
                return (
                  <div key={idx} className="not-prose">
                    <ThemeCards title={b.title} themes={b.themes} />
                  </div>
                );
              }
              return (
                <div key={idx} className="overflow-x-auto">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{b.content}</ReactMarkdown>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

