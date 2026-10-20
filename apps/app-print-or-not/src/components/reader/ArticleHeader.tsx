import SideBadge from "@/components/SideBadge";
import { AUTHOR_TYPE_LABEL } from "@/lib/content";
import type { Article } from "@/lib/types";

// 冒頭は出典を1行で示し、詳細（元記事リンク＝Lv3、Who says so?）は本文の直後の SourcesBox に置く。
// スマホで出典欄が本文より先に画面を占めないようにするため。
export default function ArticleHeader({ article, challenge }: { article: Article; challenge: boolean }) {
  return (
    <header className="mb-4">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <SideBadge side={article.side} />
        <span className="text-sm" aria-label={`難易度 ${article.difficulty}/3`}>
          {"★".repeat(article.difficulty)}
          {"☆".repeat(3 - article.difficulty)}
        </span>
        <span className="muted">約{article.minutes}分</span>
        {challenge && <span className="rounded-full border border-line px-2 py-0.5 text-xs text-muted">Challenge ✓</span>}
      </div>
      <h1 className="page-title !mb-3">{article.hookTitle}</h1>
      <p className="muted">
        出典：{article.sources.map((src) => `${src.publisher}（${src.date.slice(0, 4)}）`).join("、")}
        <a href="#sources" className="ml-2 text-accent-strong underline">
          出典と Who says so?
        </a>
      </p>
    </header>
  );
}

export function SourcesBox({ article }: { article: Article }) {
  return (
        <section id="sources" className="box mt-6 scroll-mt-16" aria-label="出典">
          <h2 className="section-title">出典（元記事 Lv3）</h2>
          <ul className="space-y-3">
            {article.sources.map((src, i) => (
              <li key={i} className="text-sm">
                <a href={src.url} target="_blank" rel="noopener" className="font-semibold text-accent-strong underline">
                  {src.title}
                </a>
                <div className="muted">
                  {src.publisher}・{src.date}
                  {src.lang === "ja" ? "・日本語" : ""}
                </div>
                <div className="mt-0.5">
                  <span className="font-semibold">Who says so? </span>
                  {AUTHOR_TYPE_LABEL[src.authorType] ?? src.authorType}。{src.biasNote}
                </div>
              </li>
            ))}
          </ul>
        </section>
  );
}
