import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { Header } from "@/components/Header"
import { MainContent } from "@/components/MainContent"

export const dynamic = "force-dynamic"

export default async function HomePage() {
  const session = await auth()

  if (!session?.user?.email) {
    redirect("/login")
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        userName={session.user.name}
        userEmail={session.user.email}
      />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <MainContent />
      </main>
    </div>
  )
}
