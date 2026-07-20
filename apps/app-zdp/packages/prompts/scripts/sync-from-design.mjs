#!/usr/bin/env node
/**
 * templates/*.md（ZDP_プロンプト設計.md から抽出したプロンプト本文）を読み取り、
 * ランタイムで安全に import できる src/templates.gen.ts を生成する。
 *
 * これにより、実装コードにプロンプト本文を書かず（要件 §7）、
 * かつ Vercel サーバレスでも fs 依存なしにテンプレートを参照できる。
 *
 * 使い方: npm run sync-prompts  （またはこのファイルを直接 node 実行）
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const templatesDir = join(here, "..", "templates");
const outFile = join(here, "..", "src", "templates.gen.ts");

const files = readdirSync(templatesDir)
  .filter((f) => f.endsWith(".md"))
  .sort();

const entries = files.map((f) => {
  const id = f.replace(/\.md$/, "").toUpperCase().replace("P0", "P-0").replace("P1", "P-1");
  const body = readFileSync(join(templatesDir, f), "utf8");
  return { id, body };
});

const header = `/**
 * 自動生成ファイル — 直接編集しないこと。
 * 生成元: packages/prompts/templates/*.md
 * 再生成: npm run sync-prompts
 */
export const TEMPLATES: Record<string, string> = {
`;

const lines = entries
  .map((e) => `  ${JSON.stringify(e.id)}: ${JSON.stringify(e.body)},`)
  .join("\n");

writeFileSync(outFile, header + lines + "\n};\n", "utf8");
console.log(`generated ${outFile} with ${entries.length} templates: ${entries.map((e) => e.id).join(", ")}`);
