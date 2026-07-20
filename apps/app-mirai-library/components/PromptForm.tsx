"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

const MAX_FREE_CHARS = 500

const STYLES = [
  {
    id: "柔らかい公共施設系",
    label: "柔らかい公共施設系",
    description: "明るく開放的・親しみやすい",
    emoji: "🌟",
  },
  {
    id: "近未来メカ系",
    label: "近未来メカ系",
    description: "金属感・光源演出・未来的",
    emoji: "🤖",
  },
  {
    id: "水彩・手描き風",
    label: "水彩・手描き風",
    description: "柔らかい色彩・手描き感",
    emoji: "🖌️",
  },
] as const

interface PromptFormProps {
  onGenerate: (prompt: string, style: string) => Promise<void>
  isGenerating: boolean
}

export function PromptForm({
  onGenerate,
  isGenerating,
}: PromptFormProps) {
  const [prompt, setPrompt] = useState("")
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null)
  const isOverLimit = prompt.length > MAX_FREE_CHARS
  const canSubmit = prompt.trim().length > 0 && selectedStyle !== null && !isGenerating

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit || !selectedStyle) return
    await onGenerate(prompt.trim(), selectedStyle)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <label
        htmlFor="prompt"
        className="block text-sm font-medium text-gray-700"
      >
        アイデアを入力してください
      </label>

      {/* Style selector */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-700">
          イラストスタイルを選択してください
          <span className="ml-1 text-red-500">*</span>
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {STYLES.map((style) => {
            const isSelected = selectedStyle === style.id
            return (
              <button
                key={style.id}
                type="button"
                disabled={isGenerating}
                onClick={() => setSelectedStyle(style.id)}
                className={`flex flex-col items-center gap-1 rounded-lg border-2 p-3 text-center transition-all cursor-pointer
                  ${isSelected
                    ? "border-blue-500 bg-blue-50 shadow-sm"
                    : "border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/50"
                  }
                  ${isGenerating ? "opacity-50 cursor-not-allowed" : ""}
                `}
              >
                <span className="text-2xl">{style.emoji}</span>
                <span className={`text-xs font-semibold leading-tight ${isSelected ? "text-blue-700" : "text-gray-800"}`}>
                  {style.label}
                </span>
                <span className="text-[10px] text-gray-400 leading-tight">
                  {style.description}
                </span>
              </button>
            )
          })}
        </div>
        {!selectedStyle && (
          <p className="text-xs text-gray-400">スタイルを1つ選ぶと生成ボタンが有効になります</p>
        )}
      </div>

      {/* Prompt textarea */}
      <div className="relative">
        <Textarea
          id="prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="例: A floor with a small café, plants everywhere, and reading nooks shaped like trees. Students can record podcasts in soundproof booths.

例（日本語）: カフェコーナーと植物がたくさんあり、木の形をした読書スペースがあるフロア。防音ブースでポッドキャストの録音もできる。"
          rows={7}
          disabled={isGenerating}
          className="w-full"
          aria-describedby="char-count"
        />
        <div
          id="char-count"
          className={`mt-1 text-right text-xs ${
            isOverLimit ? "text-orange-600 font-medium" : "text-gray-400"
          }`}
        >
          {prompt.length}文字
          {isOverLimit && " (500文字を超えています。送信は可能ですが、短くするとより良い結果が得られます)"}
        </div>
      </div>

      <Button
        type="submit"
        disabled={!canSubmit}
        className="w-full"
        size="lg"
      >
        {isGenerating ? (
          <span className="flex items-center gap-2">
            <svg
              className="h-4 w-4 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            生成中... (約20〜40秒かかります)
          </span>
        ) : (
          "画像を生成する (Generate Image)"
        )}
      </Button>
    </form>
  )
}
