/**
 * ゴールデンセット回帰テスト（要件定義 §10）。
 *
 * data/golden/essays.json の英文全件に生成パイプラインを実行し、
 * Gate1/2/3 通過率・型分布・平均難易度・実行時間・失敗ケース一覧を
 * Markdown レポートとして data/golden/report-<日時>.md に保存する。
 *
 * 実行方法:
 *   npm run golden                 # 全件（22本 ≒ API呼び出し 約150回）
 *   npm run golden -- --limit 3    # 先頭3本だけ（動作確認用）
 *   npm run golden -- --mode vocab # 出質モード指定（既定: idea）
 *
 * 運用ルール: prompts/ の version を変更したら実行し、前回レポートと比較する。
 * 実データ（data/db）には書き込まない（一時DBを使用）。
 */

import fs from "fs";
import os from "os";
import path from "path";

// 実データを汚さないよう、ストレージ読込前に一時DBへ切り替える
const tmpDb = fs.mkdtempSync(path.join(os.tmpdir(), "oral-exam-golden-"));
process.env.ORAL_EXAM_DB_DIR = tmpDb;
process.env.STORAGE_DRIVER = "json";

interface Essay {
  label: string;
  note: string;
  text: string;
}

function parseArgs(): { limit: number; mode: "idea" | "logic" | "vocab" } {
  const args = process.argv.slice(2);
  const limitIdx = args.indexOf("--limit");
  const modeIdx = args.indexOf("--mode");
  const mode = (modeIdx !== -1 ? args[modeIdx + 1] : "idea") as
    | "idea"
    | "logic"
    | "vocab";
  return {
    limit: limitIdx !== -1 ? Number(args[limitIdx + 1]) : Infinity,
    mode: ["idea", "logic", "vocab"].includes(mode) ? mode : "idea",
  };
}

async function main() {
  // .env.local を読み込む（Next.js 外での実行のため）
  const envPath = path.join(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
      const m = line.match(/^([A-Z_]+)=(.*)$/);
      if (m && !["ORAL_EXAM_DB_DIR", "STORAGE_DRIVER"].includes(m[1]) && m[2]) {
        process.env[m[1]] = m[2].trim();
      }
    }
  }
  if (!process.env.GEMINI_API_KEY) {
    console.error("GEMINI_API_KEY が設定されていません（.env.local を確認）");
    process.exit(1);
  }

  const { limit, mode } = parseArgs();
  const essaysPath = path.join(process.cwd(), "data", "golden", "essays.json");
  const essays = (JSON.parse(fs.readFileSync(essaysPath, "utf-8")) as Essay[]).slice(
    0,
    limit
  );

  console.log(
    `ゴールデンセット回帰テスト: ${essays.length}本（mode=${mode}）` +
      `／推定API呼び出し 最大${essays.length * 8}回（レート制限のため約${Math.ceil((essays.length * 8 * 6.5) / 60)}分）`
  );

  // 動的import（ORAL_EXAM_DB_DIR 設定後に読み込む必要がある）
  const { getStorage } = await import("../src/lib/storage/adapter");
  const { runPipeline } = await import("../src/lib/pipeline/generate");
  const { loadPrompt } = await import("../src/lib/llm/prompts");
  const { getCallCount, resetCallCount } = await import("../src/lib/llm/gemini");

  // プロンプトバージョン一覧（レポートに記録）
  const promptFiles = [
    "generate_type1",
    "generate_type2",
    "generate_type3",
    "generate_type4",
    "generate_type5",
    "solve",
    "semantic_match",
    "judge",
  ];
  const promptVersions = promptFiles.map(
    (name) => `${name}: ${loadPrompt(name).version}`
  );

  const storage = await getStorage();
  const assignmentId = `a_golden_${Date.now()}`;
  await storage.insert("assignments", [
    {
      assignment_id: assignmentId,
      title: "golden-test",
      mode,
      question_count: 3,
      created_at: new Date().toISOString(),
    },
  ]);
  const submissions = essays.map((e, i) => ({
    submission_id: `s_golden_${i}`,
    assignment_id: assignmentId,
    student_label: e.label,
    text: e.text,
    status: "submitted" as const,
    analysis: null,
  }));
  await storage.insert("submissions", submissions);

  resetCallCount();
  const startedAt = Date.now();
  const rows: {
    label: string;
    note: string;
    ok: boolean;
    candidates: number;
    g1: number;
    g2: number;
    g3: number;
    selected: number;
    seconds: number;
    warnings: string[];
  }[] = [];

  for (const [i, sub] of submissions.entries()) {
    const t0 = Date.now();
    process.stdout.write(
      `[${i + 1}/${submissions.length}] ${sub.student_label} ... `
    );
    try {
      const report = await runPipeline(sub.submission_id);
      rows.push({
        label: sub.student_label,
        note: essays[i].note,
        ok: report.ok,
        candidates: report.candidate_count,
        g1: report.gate1_pass_count,
        g2: report.gate2_pass_count,
        g3: report.gate3_pass_count,
        selected: report.selected_count,
        seconds: Math.round((Date.now() - t0) / 1000),
        warnings: report.warnings,
      });
      console.log(report.ok ? "OK" : "NG", `(${Math.round((Date.now() - t0) / 1000)}s)`);
    } catch (err) {
      rows.push({
        label: sub.student_label,
        note: essays[i].note,
        ok: false,
        candidates: 0,
        g1: 0,
        g2: 0,
        g3: 0,
        selected: 0,
        seconds: Math.round((Date.now() - t0) / 1000),
        warnings: [err instanceof Error ? err.message : String(err)],
      });
      console.log("ERROR");
    }
  }
  const totalSeconds = Math.round((Date.now() - startedAt) / 1000);

  // 型分布・平均難易度（選抜された問い）
  const questions = await storage.list("questions");
  const selected = questions.filter((q) => q.status === "selected");
  const typeDist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const q of selected) typeDist[q.type] = (typeDist[q.type] ?? 0) + 1;
  const avgDifficulty =
    selected.length > 0
      ? (
          selected.reduce((a, q) => a + q.difficulty_score, 0) / selected.length
        ).toFixed(1)
      : "—";

  const sum = (f: (r: (typeof rows)[number]) => number) =>
    rows.reduce((a, r) => a + f(r), 0);
  const pct = (num: number, den: number) =>
    den > 0 ? `${Math.round((num / den) * 100)}%` : "—";

  const now = new Date();
  const stamp = now.toISOString().slice(0, 16).replace("T", "-").replace(":", "");
  const reportPath = path.join(
    process.cwd(),
    "data",
    "golden",
    `report-${stamp}.md`
  );

  const md = `# ゴールデンセット回帰レポート ${now.toLocaleString("ja-JP")}

## 実行条件

- 対象: ${rows.length}本（mode=${mode}, question_count=3）
- 実行時間: ${Math.floor(totalSeconds / 60)}分${totalSeconds % 60}秒 ／ API呼び出し: ${getCallCount()}回
- プロンプトバージョン:
${promptVersions.map((v) => `  - ${v}`).join("\n")}

## サマリー

| 指標 | 値 |
| :--- | :--- |
| 完走（3問選抜成功） | ${rows.filter((r) => r.ok).length}/${rows.length} |
| 候補生成数 | ${sum((r) => r.candidates)} |
| Gate1 通過率 | ${pct(sum((r) => r.g1), sum((r) => r.candidates))}（${sum((r) => r.g1)}/${sum((r) => r.candidates)}） |
| Gate2 通過率 | ${pct(sum((r) => r.g2), sum((r) => r.g1))}（${sum((r) => r.g2)}/${sum((r) => r.g1)}） |
| Gate3 通過率 | ${pct(sum((r) => r.g3), sum((r) => r.g2))}（${sum((r) => r.g3)}/${sum((r) => r.g2)}） |
| 選抜数 | ${sum((r) => r.selected)} |
| 選抜問題の平均難易度 | ${avgDifficulty} |
| 型分布（選抜） | 型1:${typeDist[1]} 型2:${typeDist[2]} 型3:${typeDist[3]} 型4:${typeDist[4]} 型5:${typeDist[5]} |

## ケース別結果

| ケース | 備考 | 結果 | 候補 | G1 | G2 | G3 | 選抜 | 時間 |
| :--- | :--- | :--- | ---: | ---: | ---: | ---: | ---: | ---: |
${rows
  .map(
    (r) =>
      `| ${r.label} | ${r.note} | ${r.ok ? "✅" : "❌"} | ${r.candidates} | ${r.g1} | ${r.g2} | ${r.g3} | ${r.selected} | ${r.seconds}s |`
  )
  .join("\n")}

## 失敗・警告一覧

${
  rows.filter((r) => r.warnings.length > 0).length === 0
    ? "なし"
    : rows
        .filter((r) => r.warnings.length > 0)
        .map((r) => `- **${r.label}**\n${r.warnings.map((w) => `  - ${w}`).join("\n")}`)
        .join("\n")
}
`;

  fs.writeFileSync(reportPath, md, "utf-8");
  console.log(`\nレポートを保存しました: ${reportPath}`);
  console.log(`一時DB: ${tmpDb}（削除して問題ありません）`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
