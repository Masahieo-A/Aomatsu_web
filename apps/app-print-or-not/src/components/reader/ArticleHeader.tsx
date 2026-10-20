import SideBadge from "@/components/SideBadge";
import type { Article } from "@/lib/types";
import SectionCard from "./SectionCard";

export default function ArticleHeader({ article }: { article: Article }) {
  return (
    <SectionCard ja="記事の紹介" en="Overview" className="mb-4" id="top">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <SideBadge side={article.side} />
        <span className="muted">約{article.minutes}分</span>
      </div>
      <h1 className="page-title !mb-1">{article.hookTitle}</h1>
      <p className="mb-3 text-base text-muted">{article.hookTitleJa}</p>
      <div className="border-l-4 border-line pl-3">
        <p className="muted">この記事の内容</p>
        <p className="text-base leading-[1.7]">{article.summaryJa}</p>
      </div>
    </SectionCard>
  );
}

// 出典は記事の最後にまとめて示す（タイトル・発行元・日付・元記事へのリンク）
export function SourcesBox({ article }: { article: Article }) {
  return (
    <SectionCard ja="出典" en="Sources" id="sources" className="mt-4">
      <ul className="space-y-3">
        {article.sources.map((src, i) => (
          <li key={i} className="text-sm">
            <a href={src.url} target="_blank" rel="noopener" className="font-semibold text-accent-strong underline">
              {src.title}
            </a>
            <div className="muted">
              {src.publisher}・{src.date}
            </div>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}
