"use client"

import { useState } from "react"
import { PromptForm } from "@/components/PromptForm"
import { GeneratedImage } from "@/components/GeneratedImage"
import { GeneratedImageData } from "@/types"

export function MainContent() {
  const [images, setImages] = useState<GeneratedImageData[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleGenerate = async (prompt: string, style: string) => {
    setIsGenerating(true)
    setError(null)

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userPrompt: prompt, style }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "エラーが発生しました。もう一度お試しください。")
        return
      }

      const now = new Date()
      const timestamp = now
        .toLocaleString("ja-JP", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
        .replace(/\//g, "-")

      const newImage: GeneratedImageData = {
        dataUrl: data.imageDataUrl,
        prompt,
        style,
        timestamp,
      }

      setImages((prev) => [...prev, newImage])
    } catch {
      setError(
        "通信エラーが発生しました。インターネット接続を確認してから再度お試しください。"
      )
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Overview section */}
      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              未来の図書館 — あなたのフロアをデザインしよう
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              The Library of the Future
            </p>
          </div>

          <div className="rounded-lg bg-blue-50 border border-blue-100 p-4 space-y-2">
            <h3 className="text-sm font-semibold text-blue-900">課題について</h3>
            <p className="text-sm text-blue-800 leading-relaxed">
              「未来の図書館」の英語プレゼンテーションのために、あなたが理想とする
              図書館の1フロアをAIで画像生成します。日本語または英語でアイデアを自由に記述してください。
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-gray-600">
            <div className="flex items-start gap-2">
              <span className="text-blue-500 font-bold mt-0.5">1</span>
              <span>どんなスペースがある？どんな雰囲気？</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-blue-500 font-bold mt-0.5">2</span>
              <span>どんな人が集まる？何ができる？</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-blue-500 font-bold mt-0.5">3</span>
              <span>英語・日本語どちらでも入力できます</span>
            </div>
          </div>
        </div>
      </section>

      {/* Form section */}
      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <PromptForm
          onGenerate={handleGenerate}
          isGenerating={isGenerating}
        />
      </section>

      {/* Error message */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Generated images */}
      {images.length > 0 && (
        <section className="space-y-6">
          <h2 className="text-base font-semibold text-gray-800">
            生成された画像 ({images.length})
          </h2>
          {images.map((image, i) => (
            <GeneratedImage key={i} image={image} index={i} />
          ))}
        </section>
      )}

      {/* Generating placeholder */}
      {isGenerating && (
        <div className="rounded-xl border bg-white p-12 shadow-sm text-center">
          <div className="flex flex-col items-center gap-4">
            <svg
              className="h-10 w-10 animate-spin text-blue-500"
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
            <div>
              <p className="text-sm font-medium text-gray-700">
                AIが画像を生成しています...
              </p>
              <p className="text-xs text-gray-400 mt-1">約20〜40秒かかります</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
