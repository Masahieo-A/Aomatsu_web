'use client';

// =============================================================================
// Header : アプリ名 + ログアウトボタンの最小コンポーネント
//   Stage 3a のトップページ等で使う。ここではコンポーネントのみ用意する。
//   ログアウトは browser クライアントで signOut → /login へ遷移。
// =============================================================================
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function Header() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function signOut() {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace('/login');
    router.refresh();
  }

  return (
    <header className="sticky top-[52px] z-10 flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)]/90 px-4 py-3 backdrop-blur">
      <span className="text-lg font-semibold tracking-tight">青松問答</span>
      <div className="flex items-center gap-1">
        {/* Stage 5 が /api/export を実装するまではリンク先が404になるが、意図どおり */}
        <a
          href="/api/export"
          className="flex min-h-11 items-center rounded-lg px-3 py-1.5 text-sm text-zinc-600 transition hover:bg-zinc-100 active:scale-[0.98] dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          エクスポート
        </a>
        <button
          type="button"
          onClick={signOut}
          disabled={loading}
          className="flex min-h-11 items-center rounded-lg px-3 py-1.5 text-sm text-zinc-600 transition hover:bg-zinc-100 active:scale-[0.98] disabled:opacity-60 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          {loading ? 'ログアウト中…' : 'ログアウト'}
        </button>
      </div>
    </header>
  );
}
