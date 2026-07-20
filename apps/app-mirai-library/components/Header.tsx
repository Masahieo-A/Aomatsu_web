"use client"

import { signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"

interface HeaderProps {
  userName?: string | null
  userEmail?: string | null
}

export function Header({ userName, userEmail }: HeaderProps) {
  return (
    <header className="sticky top-[52px] z-40 w-full border-b bg-white shadow-sm">
      <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white text-sm font-bold">
            図
          </div>
          <div>
            <h1 className="text-base font-bold text-gray-900 leading-tight">
              未来の図書館
            </h1>
            <p className="text-xs text-gray-500 leading-tight">
              Future Library Generator
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {(userName || userEmail) && (
            <div className="hidden sm:block text-right">
              {userName && (
                <p className="text-sm font-medium text-gray-900">{userName}</p>
              )}
              {userEmail && (
                <p className="text-xs text-gray-500">{userEmail}</p>
              )}
            </div>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            ログアウト
          </Button>
        </div>
      </div>
    </header>
  )
}
