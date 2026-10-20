"use client";
import { useState } from "react";
import Link from "next/link";
import SideBadge from "@/components/SideBadge";
import { AUTHOR_TYPE_LABEL, getArticle, getPoint } from "@/lib/content";
import { mySide } from "@/lib/progress";
import { useStudent } from "@/lib/store";
import { COPY_WARN_RATIO, copyRatio, countWords, fillHidden, hasJapanese, splitSentences } from "@/lib/text";
import type { Article, EvidenceCard, StudentState } from "@/lib/types";

export default function CardForm({ id, s }: { id: string; s: StudentState }) {
  const article = getArticle(id);
  if (!article) {
    return (
      <div className="page">
        <p className="mb-3">記事が見つかりません。</p>
        <Link href="/map" className="btn-secondary">
          記事の一覧へ
        </Link>
      </div>
    );
  }
  return <Form article={article} s={s} />;
}

function Form({ article, s }: { article: Article; s: StudentState }) {
  const { settings, update, sync } = useStudent();
  const prev = s.cards[article.id];

  const [point, setPoint] = useState(prev?.point ?? "");
  const [sentence, setSentence] = useState(prev?.sourceSentence ?? "");
  const [fact, setFact] = useState(prev?.fact ?? "");
  const [numberExample, setNumberExample] = useState(prev?.numberExample ?? "");
  const [soWhat, setSoWhat] = useState(prev?.soWhat ?? "");
  const [weakPoint, setWeakPoint] = useState(prev?.weakPoint ?? "");
  const [tried, setTried] = useState(false); // 保存を一度押したか（未入力エラーはそれまで出さない）
  const [probe, setProbe] = useState(false); // 「それで？」の追加質問を出したか
  const [saved, setSaved] = useState(false);

  // 伏せ数字は公開扱いで展開してから文に分ける（「？？？」で文分割が崩れないように）
  const sentences = article.levels.lv1.paragraphs.flatMap((p) =>
    splitSentences(fillHidden(p.text, article, () => true)),
  );
  const me = mySide(s);
  const weakRequired = me !== undefined && article.side !== me;

  const factTrim = fact.trim();
  const soWhatTrim = soWhat.trim();
  const copyWarn = !!sentence && factTrim !== "" && copyRatio(factTrim, sentence) >= COPY_WARN_RATIO;
  const jaBlocked = !settings.soWhatJaAllowed && hasJapanese(soWhat);
  const soWhatWeak = soWhatTrim !== "" && (countWords(soWhatTrim) < 4 || copyRatio(soWhatTrim, factTrim) >= 0.6);

  const missing: string[] = [];
  if (!point) missing.push("Point を選ぶ");
  if (!sentence) missing.push("本文から文を1つ選ぶ");
  if (!factTrim) missing.push("Fact を自分の英語で書く");
  if (!soWhatTrim) missing.push("So what? を書く");
  if (weakRequired && !weakPoint.trim()) missing.push("Weak point を書く（反対側の記事では必須）");

  const save = () => {
    setTried(true);
    setSaved(false);
    if (missing.length > 0 || jaBlocked) return;
    if (soWhatWeak && !probe) {
      setProbe(true); // 1回目は保存せず、追加の問いを出す
      return;
    }
    const now = new Date().toISOString();
    const card: EvidenceCard = {
      articleId: article.id,
      side: article.side,
      point,
      sourceSentence: sentence,
      fact: factTrim,
      numberExample: numberExample.trim(),
      soWhat: soWhatTrim,
      weakPoint: weakPoint.trim(),
      createdAt: prev?.createdAt ?? now,
      updatedAt: now,
    };
    update((cur) => ({ ...cur, cards: { ...cur.cards, [article.id]: card } }));
    sync("card", card);
    setSaved(true);
  };

  return (
    <div className="page">
      <h1 className="page-title">Evidence Card</h1>
      <p className="mb-4 text-base">{article.hookTitle}</p>

      <section className="box mb-4">
        <div className="mb-2 flex items-center gap-2">
          <span className="text-sm font-semibold">Side</span>
          <SideBadge side={article.side} />
        </div>
        <h2 className="field-label">Source</h2>
        <ul className="space-y-1 text-sm">
          {article.sources.map((src, i) => (
            <li key={i}>
              {src.title}（{src.publisher}・{src.date}・{AUTHOR_TYPE_LABEL[src.authorType] ?? src.authorType}）
            </li>
          ))}
        </ul>
      </section>

      <fieldset className="mb-5">
        <legend className="field-label">Point（必須）：この事実は何を支える？</legend>
        <div className="space-y-2">
          {article.cardPoints.map((pid) => {
            const def = getPoint(pid);
            return (
              <label
                key={pid}
                className={`flex min-h-11 cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 ${
                  point === pid ? "border-accent bg-accent-dim" : "border-line"
                }`}
              >
                <input
                  type="radio"
                  name="point"
                  value={pid}
                  checked={point === pid}
                  onChange={() => setPoint(pid)}
                  className="mt-1.5"
                />
                <span>
                  {def?.en ?? pid}
                  {def && <span className="muted block">{def.ja}</span>}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <section className="mb-5">
        <h2 className="field-label">Fact（必須）：本文から文を1つ選ぶ</h2>
        <ul className="mb-3 space-y-2">
          {sentences.map((st, i) => (
            <li key={i}>
              <button
                type="button"
                aria-pressed={sentence === st}
                onClick={() => setSentence(st)}
                className={`min-h-11 w-full rounded-lg border px-3 py-2 text-left text-base ${
                  sentence === st ? "border-accent bg-accent-dim font-semibold" : "border-line bg-white"
                }`}
              >
                {sentence === st ? "✓ " : ""}
                {st}
              </button>
            </li>
          ))}
        </ul>
        {sentence && (
          <>
            <label htmlFor="fact" className="field-label">
              選んだ文を、自分の英語で短く書き直す
            </label>
            <textarea
              id="fact"
              className="field"
              rows={3}
              maxLength={300}
              value={fact}
              onChange={(e) => setFact(e.target.value)}
              lang="en"
            />
            {copyWarn && (
              <p className="error-text mt-1" role="alert">
                ⚠ 選んだ文とほとんど同じです。単語や語順を変えて、もう一度書き直してください。
              </p>
            )}
          </>
        )}
      </section>

      <section className="mb-5">
        <label htmlFor="num" className="field-label">
          Number / Example（推奨）：数字や具体例
        </label>
        <textarea
          id="num"
          className="field"
          rows={2}
          maxLength={150}
          value={numberExample}
          onChange={(e) => setNumberExample(e.target.value)}
          lang="en"
        />
      </section>

      <section className="mb-5">
        <label htmlFor="sowhat" className="field-label">
          So what?（必須）：だから何が言える？{settings.soWhatJaAllowed ? "（日本語も可）" : "（英語で）"}
        </label>
        <textarea
          id="sowhat"
          className="field"
          rows={3}
          maxLength={300}
          value={soWhat}
          onChange={(e) => setSoWhat(e.target.value)}
        />
        {jaBlocked && (
          <p className="error-text mt-1" role="alert">
            So what? は英語で書いてください（日本語は今は使えません）。
          </p>
        )}
        {probe && (
          <p className="mt-2 rounded-lg border border-line p-3 text-sm" role="status">
            <b>それで？</b> 誰にとって何が良く／悪くなる？ 書き足してから、もう一度保存してください。
          </p>
        )}
      </section>

      <section className="mb-5">
        <label htmlFor="weak" className="field-label">
          Weak point{weakRequired ? "（必須：反対側の記事）" : "（任意）"}：この根拠の弱点
        </label>
        <textarea
          id="weak"
          className="field"
          rows={2}
          maxLength={300}
          value={weakPoint}
          onChange={(e) => setWeakPoint(e.target.value)}
        />
      </section>

      {tried && missing.length > 0 && (
        <ul className="error-text mb-3 list-inside list-disc" role="alert">
          {missing.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="btn" onClick={save}>
          {prev || saved ? "Card を更新する" : "Card を保存する"}
        </button>
        <Link href="/map" className="btn-secondary">
          {saved ? "一覧へ戻る" : "保存せず戻る"}
        </Link>
      </div>
      {saved && (
        <p className="mt-3 text-sm font-semibold" role="status">
          ✓ 保存しました。
        </p>
      )}
    </div>
  );
}
