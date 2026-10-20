"use client";
// トップ = 記事を探す画面（課題 → 記事を探す → 進め方）
import RequireStudent from "@/components/RequireStudent";
import ArticleSearch from "@/components/home/ArticleSearch";
import StepsPanel from "@/components/home/StepsPanel";
import { useStudent } from "@/lib/store";
import type { StudentState } from "@/lib/types";

export default function HomePage() {
  return <RequireStudent>{(s) => <Home s={s} />}</RequireStudent>;
}

function Home({ s }: { s: StudentState }) {
  const { reset } = useStudent();

  return (
    <div className="page space-y-6">
      <section className="box" aria-labelledby="topic-title">
        <h1 id="topic-title" className="page-title !mb-2">
          PRINT or NOT?
        </h1>
        <p className="font-semibold">Should 3D-printed food become more widespread, or should it be restricted?</p>
        <p className="muted">3Dプリント食品は、もっと広めるべき？ それとも制限すべき？</p>
      </section>

      <ArticleSearch />
      <StepsPanel s={s} />

      <p className="text-right text-xs">
        <button
          type="button"
          className="text-muted underline"
          onClick={() => {
            if (confirm("この端末の記録（立場・クイズ・下書き）をすべて消して、最初からにしますか？")) reset();
          }}
        >
          この端末の記録を消す
        </button>
      </p>
    </div>
  );
}
