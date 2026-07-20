/**
 * ローカルJSON（data/db/*.json）のデータを Google スプレッドシートへ移行する。
 *
 * 使い方:
 *   npx tsx scripts/migrate-json-to-sheets.ts
 *
 * .env.local の GOOGLE_SERVICE_ACCOUNT_KEY_PATH / SPREADSHEET_ID を使用する。
 * 同じ ID の行がすでにシートにある場合はスキップする（重複防止）。
 */

import fs from "fs";
import path from "path";

// .env.local を読み込む（Next.js 外での実行のため）
const envPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m && m[2]) process.env[m[1]] = m[2].trim();
  }
}

async function main() {
  const keyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH;
  const spreadsheetId = process.env.SPREADSHEET_ID;
  if (!keyPath || !spreadsheetId) {
    console.error(
      "GOOGLE_SERVICE_ACCOUNT_KEY_PATH / SPREADSHEET_ID が未設定です"
    );
    process.exit(1);
  }

  const { SheetsStorageAdapter } = await import("../src/lib/storage/sheets");
  const { TABLE_NAMES } = await import("../src/types");
  const sheets = new SheetsStorageAdapter(keyPath, spreadsheetId);

  const ID_COLUMNS: Record<string, string> = {
    assignments: "assignment_id",
    submissions: "submission_id",
    questions: "question_id",
    results: "question_id",
  };

  for (const table of TABLE_NAMES) {
    const file = path.join(process.cwd(), "data", "db", `${table}.json`);
    if (!fs.existsSync(file)) {
      console.log(`${table}: ローカルデータなし（スキップ）`);
      continue;
    }
    const rows = JSON.parse(fs.readFileSync(file, "utf-8"));
    const idColumn = ID_COLUMNS[table];
    const existing = await sheets.list(table);
    const existingIds = new Set(
      existing.map((r) => (r as Record<string, unknown>)[idColumn])
    );
    const newRows = rows.filter(
      (r: Record<string, unknown>) => !existingIds.has(r[idColumn])
    );
    if (newRows.length > 0) {
      await sheets.insert(table, newRows);
    }
    console.log(
      `${table}: ${newRows.length}件を移行（既存${existing.length}件・重複スキップ${rows.length - newRows.length}件）`
    );
  }
  console.log("\n移行完了。スプレッドシートを開いて確認してください。");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
