"use client"

import { useState } from "react"
import { GeneratedImageData } from "@/types"

interface GeneratedImageProps {
  image: GeneratedImageData
  index: number
}

function formatTimestamp(ts: string): string {
  return ts.replace(/[^0-9]/g, "").slice(0, 14)
}

export function GeneratedImage({ image, index }: GeneratedImageProps) {
  const [isSaving, setIsSaving] = useState(false)

  const handleDownload = async () => {
    if (isSaving) return
    setIsSaving(true)

    const ts = formatTimestamp(image.timestamp)
    const filename = `future-library-${index + 1}-${ts}.png`

    try {
      // base64 data URL → Blob に変換（iOS Safari 含む全環境で動作）
      const res = await fetch(image.dataUrl)
      const blob = await res.blob()
      const blobUrl = URL.createObjectURL(blob)

      const link = document.createElement("a")
      link.href = blobUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      // 少し待ってから解放
      setTimeout(() => URL.revokeObjectURL(blobUrl), 2000)
    } catch {
      // フォールバック：新しいタブで開く（長押しで保存可能）
      window.open(image.dataUrl, "_blank")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
      <div className="p-4 border-b bg-gray-50">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-700">
            生成画像 {index + 1}枚目
          </span>
          <span className="text-xs text-gray-400">{image.timestamp}</span>
        </div>
      </div>

      {/* Image with overlay save button */}
      <div className="p-4">
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image.dataUrl}
            alt="生徒が生成した未来の図書館のイメージ"
            className="w-full rounded-lg"
          />
          {/* Overlay download button */}
          <button
            onClick={handleDownload}
            disabled={isSaving}
            aria-label="端末に保存"
            title="端末に保存 (PNG)"
            className="absolute bottom-3 right-3 flex items-center justify-center w-11 h-11 rounded-full bg-black/55 hover:bg-black/75 active:bg-black/90 text-white shadow-lg transition-colors disabled:opacity-50"
          >
            {isSaving ? (
              /* Spinner */
              <svg className="h-5 w-5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              /* Download icon (arrow-down-to-line) */
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3v13" />
                <path d="m7 11 5 5 5-5" />
                <line x1="3" y1="20" x2="21" y2="20" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Style + Prompt display */}
      <div className="px-4 pb-4 space-y-2">
        {image.style && (
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1">スタイル:</p>
            <span className="inline-block rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700 font-medium">
              {image.style}
            </span>
          </div>
        )}
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1">使用したプロンプト:</p>
          <p className="text-xs text-gray-600 bg-gray-50 rounded p-2 leading-relaxed whitespace-pre-wrap">
            {image.prompt}
          </p>
        </div>
      </div>
    </div>
  )
}
