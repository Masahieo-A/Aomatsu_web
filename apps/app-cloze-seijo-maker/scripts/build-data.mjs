// Parse scripts/source-data.md (a Markdown table exported from the
// CT_整序maker spreadsheet) into the two static JSON files the app reads:
//   public/data/cloze.json  — full sentences (blanks are generated at render time)
//   public/data/seijo.json  — same sentences, tokenized at runtime by split(" ")
//
// Order within each (lesson, part) group follows the row order in the sheet
// (narrative order), NOT the "No." column, which restarts/overflows per part.
//
//   node scripts/build-data.mjs

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const raw = readFileSync(join(__dirname, "source-data.md"), "utf8");

const rows = [];
for (const line of raw.split("\n")) {
  const t = line.trim();
  if (!t.startsWith("|")) continue;
  // Split table cells, drop the leading/trailing empties from the outer pipes.
  const cells = t.split("|").slice(1, -1).map((c) => c.trim());
  if (cells.length < 5) continue;
  const [no, lesson, part, body, trans] = cells;
  // Skip the header row and the markdown alignment separator (":-:").
  if (lesson === "Lesson" || /^:?-+:?$/.test(no)) continue;
  rows.push({ no, lesson, part, body, trans });
}

// Assign per-(lesson,part) sequence numbers in sheet order.
const counters = new Map();
const cloze = [];
const seijo = [];
let id = 0;

for (const r of rows) {
  const key = `${r.lesson}__${r.part}`;
  const seq = (counters.get(key) ?? 0) + 1;
  counters.set(key, seq);
  id += 1;

  const body = r.body.replace(/\s+/g, " ").trim();

  cloze.push({
    id,
    lesson: r.lesson,
    part: r.part,
    title: null,
    display_order: seq,
    body,
    trans: r.trans || null,
  });

  seijo.push({
    id,
    lesson: r.lesson,
    part: r.part,
    title: null,
    seq,
    sentence: body, // tokenized at runtime via split(" ")
    trans: r.trans || null,
  });
}

const dataDir = join(root, "public", "data");
mkdirSync(dataDir, { recursive: true });
writeFileSync(join(dataDir, "cloze.json"), JSON.stringify(cloze, null, 2) + "\n");
writeFileSync(join(dataDir, "seijo.json"), JSON.stringify(seijo, null, 2) + "\n");

console.log(`Parsed ${rows.length} rows.`);
const summary = {};
for (const r of rows) {
  const k = `${r.lesson} / ${r.part}`;
  summary[k] = (summary[k] ?? 0) + 1;
}
for (const [k, v] of Object.entries(summary)) console.log(`  ${k}: ${v}`);
