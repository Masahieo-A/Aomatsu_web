import SideBadge from "@/components/SideBadge";
import { AUTHOR_TYPE_LABEL } from "@/lib/content";
import type { Article } from "@/lib/types";
import SectionCard from "./SectionCard";

// 冒頭は出典を1行で示し、詳細（元記事リンク＝Lv3、Who says so?）は本文の直後の SourcesBox に置く。
// スマホで出典欄が本文より先に画面を占めないようにするため。
export default function ArticleHeader({
  article,
  challenge,
}: {
  article: Article;
  challenge: boolean;
}) {
  return (
    <SectionCard ja="記事の紹介" en="Overview" className="mb-4" id="top">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <SideBadge side={article.side} />
        <span className="text-sm" aria-label={`難易度 ${article.difficulty}/3`}>
          {"★".repeat(article.difficulty)}
          {"☆".repeat(3 - article.difficulty)}
        </span>
        <span className="muted">約{article.minutes}分</span>
        {challenge && (
          <span className="rounded-full border border-line px-2 py-0.5 text-xs text-muted">
            Challenge ✓
          </span>
        )}
      </div>
      <h1 className="page-title !mb-1">{article.hookTitle}</h1>
      <p className="mb-3 text-base text-muted">{article.hookTitleJa}</p>
      <div className="mb-3 border-l-4 border-line pl-3">
        <p className="muted">この記事の内容</p>
        <p className="text-base leading-[1.7]">{article.summaryJa}</p>
      </div>
      <p className="muted">
        出典：
        {article.sources
          .map((src) => `${src.publisher}（${src.date.slice(0, 4)}）`)
          .join("、")}
        <a
          href="#sources"
          className="ml-2 inline-flex min-h-11 items-center text-accent-strong underline"
        >
          出典と Who says so?
        </a>
      </p>
    </SectionCard>
  );
}

export function SourcesBox({ article }: { article: Article }) {
  return (
    <SectionCard
      ja="出典"
      en="Sources"
      id="sources"
      className="mt-4 scroll-mt-16"
    >
      <p className="muted mb-3">
        Who says so? ＝ 書き手は誰で、どんな偏りがありうるか。
      </p>
      <ul className="space-y-3">
        {article.sources.map((src, i) => (
          <li key={i} className="text-sm">
            <a
              href={src.url}
              target="_blank"
              rel="noopener"
              className="font-semibold text-accent-strong underline"
            >
              {src.title}
            </a>
            <div className="muted">
              {src.publisher}・{src.date}
              {src.lang === "ja" ? "・日本語" : ""}
            </div>
            <div className="mt-0.5">
              <span className="font-semibold">Who says so? </span>
              {AUTHOR_TYPE_LABEL[src.authorType] ?? src.authorType}。
              {src.biasNote}
            </div>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}
