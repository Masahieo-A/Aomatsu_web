// 記事JSONの機械チェック。使い方: npm run check:articles -- [pro-01 ...]（省略で全記事）
// 語彙レベルの最終判断は教員が行う。ここでは形式・語数・文長・整合だけを見る。
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { Article } from "../src/lib/types";
import { countWords, hiddenIndexesIn, splitSentences } from "../src/lib/text";

const dir = join(__dirname, "../src/data/articles");
const points = JSON.parse(readFileSync(join(__dirname, "../src/data/points.json"), "utf8")) as { id: string }[];
const pointIds = new Set(points.map((p) => p.id));
const ids = process.argv.slice(2).length
  ? process.argv.slice(2)
  : readdirSync(dir).filter((f) => f.endsWith(".json")).map((f) => f.replace(".json", ""));

let failed = 0;
for (const id of ids) {
  const errors: string[] = [];
  const warns: string[] = [];
  const a = JSON.parse(readFileSync(join(dir, `${id}.json`), "utf8")) as Article;
  const plain = (t: string) => t.replace(/\{\{hidden:(\d+)\}\}/g, (_, i) => a.hiddenNumbers[Number(i)]?.display ?? "X");

  if (a.id !== id) errors.push(`id が ${a.id}（ファイル名は ${id}）`);
  if (!a.hookTitle.endsWith("?")) errors.push("hookTitle が問いの形（?で終わる）でない");
  if (!a.hookTitleJa || !a.summaryJa) errors.push("hookTitleJa / summaryJa が空");
  if (!a.sources.length) errors.push("sources が空");
  for (const s of a.sources) {
    if (!/^https?:\/\//.test(s.url)) errors.push(`URL不正: ${s.url}`);
    if (!s.biasNote) errors.push(`biasNote が空: ${s.title}`);
  }
  if (!pointIds.has(a.point)) errors.push(`point が未定義: ${a.point}`);
  for (const p of a.cardPoints) if (!pointIds.has(p)) errors.push(`cardPoints に未定義: ${p}`);

  for (const lv of ["lv1", "lv2"] as const) {
    const paras = a.levels[lv].paragraphs;
    const all = paras.map((p) => plain(p.text)).join(" ");
    const wc = countWords(all);
    const [min, max] = lv === "lv1" ? [200, 300] : [350, 450];
    if (wc < min || wc > max) errors.push(`${lv} 語数 ${wc}（目標 ${min}〜${max}）`);
    paras.forEach((p, i) => {
      if (!Array.isArray(p.hints) || p.hints.length !== 3) errors.push(`${lv} 段落${i} hints が3つでない`);
      const slashPlain = p.slash.replace(/\s*\/\s*/g, " ").replace(/\s+/g, " ").trim();
      if (slashPlain !== p.text.replace(/\s+/g, " ").trim()) errors.push(`${lv} 段落${i} slash から / を除くと本文と一致しない`);
      if (/\b(Dr|Mr|Mrs|Ms|U\.S|U\.K|e\.g|i\.e|etc)\./.test(p.text)) errors.push(`${lv} 段落${i} ピリオド付き略語がある（文分割が壊れる）`);
      if (lv === "lv1") {
        for (const s of splitSentences(plain(p.text))) {
          const n = countWords(s);
          if (n > 15) errors.push(`lv1 段落${i} 15語超(${n}): ${s}`);
        }
      }
    });
    // 伏せ数字は各レベルに1回ずつ登場させる
    a.hiddenNumbers.forEach((_, idx) => {
      const count = paras.filter((p) => hiddenIndexesIn(p.text).includes(idx)).length;
      if (count === 0) errors.push(`${lv} に {{hidden:${idx}}} がない`);
    });
  }

  if (a.hiddenNumbers.length < 1 || a.hiddenNumbers.length > 2) errors.push(`hiddenNumbers は1〜2個（現在 ${a.hiddenNumbers.length}）`);
  a.hiddenNumbers.forEach((h, idx) => {
    const p = a.levels.lv1.paragraphs[h.paragraph];
    if (!p || !hiddenIndexesIn(p.text).includes(idx)) errors.push(`hiddenNumbers[${idx}].paragraph の段落に {{hidden:${idx}}} がない`);
    if (h.choices && !h.choices.includes(h.answer)) errors.push(`hiddenNumbers[${idx}] choices に answer がない`);
    if (!h.choices && (h.min === undefined || h.max === undefined)) errors.push(`hiddenNumbers[${idx}] choices か min/max が必要`);
  });

  if (a.glossary.length < 8 || a.glossary.length > 12) errors.push(`glossary は8〜12語（現在 ${a.glossary.length}）`);
  const lv1Text = a.levels.lv1.paragraphs.map((p) => p.text).join(" ").toLowerCase();
  for (const g of a.glossary) {
    const forms = [g.word, ...(g.forms ?? [])].map((f) => f.toLowerCase());
    const found = forms.some((f) => new RegExp(`\\b${f.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(lv1Text));
    if (!found) errors.push(`glossary「${g.word}」が lv1 本文に出てこない（forms を確認）`);
  }

  if (a.factOpinion.length !== 3) errors.push(`factOpinion は3文（現在 ${a.factOpinion.length}）`);
  const lv1Sentences = a.levels.lv1.paragraphs.flatMap((p) => splitSentences(p.text));
  for (const f of a.factOpinion) {
    if (!lv1Sentences.includes(f.sentence)) errors.push(`factOpinion の文が lv1 本文の文と完全一致しない: ${f.sentence}`);
  }
  if (!a.factOpinion.some((f) => f.answer === "opinion")) warns.push("factOpinion に opinion が1つもない");

  const quotes = (a.levels.lv1.paragraphs.map((p) => p.text).join(" ").match(/["“]/g) ?? []).length;
  if (quotes > 2) warns.push("lv1 に引用符が複数（直接引用は1か所・15語未満まで）");

  console.log(`\n[${id}] ${errors.length ? "NG" : "OK"}`);
  errors.forEach((e) => console.log("  ✗ " + e));
  warns.forEach((w) => console.log("  △ " + w));
  if (errors.length) failed++;
}
console.log(`\n${ids.length}件中 NG ${failed}件`);
process.exit(failed ? 1 : 0);
