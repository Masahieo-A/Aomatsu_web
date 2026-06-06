import { EssayForm } from "@/components/EssayForm";

/**
 * 入力画面（/）— 英作文と条件の入力
 */
export default function HomePage() {
  return (
    <main className="min-h-screen bg-background">
      <EssayForm />
    </main>
  );
}
