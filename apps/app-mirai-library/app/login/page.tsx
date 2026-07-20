"use client"

import { signIn } from "next-auth/react"
import { useSearchParams } from "next/navigation"
import { Suspense } from "react"

function LoginContent() {
  const searchParams = useSearchParams()
  const error = searchParams.get("error")

  const isDomainError =
    error === "AccessDenied" || error === "Signin"

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-white px-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo / Title */}
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-600 text-white text-2xl font-bold shadow-md">
            図
          </div>
          <h1 className="text-2xl font-bold text-gray-900">未来の図書館</h1>
          <p className="text-sm text-gray-500">Future Library Generator</p>
        </div>

        {/* Error message */}
        {isDomainError && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-center">
            <p className="text-sm font-medium text-red-700">
              このアプリは本校の生徒のみ利用できます
            </p>
            <p className="text-xs text-red-500 mt-1">
              学校から発行されたGoogleアカウントでログインしてください。
            </p>
          </div>
        )}

        {/* Description */}
        <div className="rounded-lg bg-white border border-gray-200 p-4 shadow-sm space-y-2">
          <h2 className="text-sm font-semibold text-gray-800">このアプリについて</h2>
          <p className="text-xs text-gray-600 leading-relaxed">
            「未来の図書館」の英語プレゼンテーション用に、あなたが構想する
            理想の図書館1フロアの画像をAIで生成できます。
          </p>
          <ul className="text-xs text-gray-500 space-y-1 list-disc list-inside">
            <li>日本語または英語でアイデアを記述</li>
            <li>画像は2回まで生成可能</li>
            <li>生成した画像を端末に保存できます</li>
          </ul>
        </div>

        {/* Login button */}
        <button
          onClick={() => signIn("google", { callbackUrl: "/" })}
          className="flex w-full items-center justify-center gap-3 rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"
            />
            <path
              fill="#34A853"
              d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"
            />
            <path
              fill="#FBBC05"
              d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07z"
            />
            <path
              fill="#EA4335"
              d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3z"
            />
          </svg>
          Googleでログイン
        </button>

        <p className="text-center text-xs text-gray-400">
          学校から発行されたGoogleアカウントを使用してください
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">読み込み中...</div>}>
      <LoginContent />
    </Suspense>
  )
}
