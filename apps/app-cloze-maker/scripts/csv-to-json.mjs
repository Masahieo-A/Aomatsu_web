/**
 * CSV → cloze.json 変換スクリプト
 *
 * 使い方:
 *   1. スプレッドシートの「ClozeTest（穴埋め）」シートを CSV でダウンロード
 *   2. このファイルと同じ scripts/ フォルダに input.csv として保存
 *   3. ターミナルで実行:
 *        cd apps/cloze-maker
 *        node scripts/csv-to-json.mjs
 *   4. public/data/cloze.json が更新される
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INPUT  = path.join(__dirname, "input.csv");
const OUTPUT = path.join(__dirname, "../public/data/cloze.json");

if (!fs.existsSync(INPUT)) {
  console.error("❌  scripts/input.csv が見つかりません。");
  console.error("   スプレッドシートから CSV をダウンロードして input.csv として保存してください。");
  process.exit(1);
}

const raw = fs.readFileSync(INPUT, "utf-8");
const lines = raw.split(/\r?\n/).filter(Boolean);

// ヘッダー行を解析
const headers = parseCSVLine(lines[0]).map(h => h.trim().toUpperCase());
const idxOf = (key) => headers.indexOf(key);

const GRADE  = idxOf("GRADE");
const LESSON = idxOf("LESSON");
const PART   = idxOf("PART");
const TITLE  = idxOf("TITLE");
const ORDER  = idxOf("ORDER");
const BODY   = idxOf("BODY");
const TRANS  = idxOf("TRANS");

if (GRADE < 0 || LESSON < 0 || PART < 0 || BODY < 0) {
  console.error("❌  CSV のヘッダーが正しくありません。");
  console.error("   必須列: GRADE, LESSON, PART, BODY");
  console.error(`   検出されたヘッダー: ${headers.join(", ")}`);
  process.exit(1);
}

const result = [];
let id = 1;

for (let i = 1; i < lines.length; i++) {
  const cols = parseCSVLine(lines[i]);
  const grade  = cols[GRADE]?.trim();
  const lesson = cols[LESSON]?.trim();
  const body   = cols[BODY]?.trim();
  if (!grade || !lesson || !body) continue; // 空行スキップ

  result.push({
    id: id++,
    grade,
    lesson,
    part:          cols[PART]?.trim()  || "",
    title:         cols[TITLE]?.trim() || null,
    display_order: Number(cols[ORDER]?.trim()) || i,
    body,
    trans:         cols[TRANS]?.trim() || null,
  });
}

fs.writeFileSync(OUTPUT, JSON.stringify(result, null, 2), "utf-8");
console.log(`✅  ${result.length} 件を変換しました → public/data/cloze.json`);
console.log("   次のステップ: git add . → git commit → git push");

// RFC 4180 準拠の CSV 行パーサー
function parseCSVLine(line) {
  const result = [];
  let cur = "";
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuote) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') inQuote = false;
      else cur += ch;
    } else {
      if (ch === '"') inQuote = true;
      else if (ch === ",") { result.push(cur); cur = ""; }
      else cur += ch;
    }
  }
  result.push(cur);
  return result;
}
