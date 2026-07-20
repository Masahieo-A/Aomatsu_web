import fs from "fs";
import path from "path";

export interface LoadedPrompt {
  /** フロントマターの version（例: v1.0）。questions.prompt_version に記録される */
  version: string;
  name: string;
  body: string;
}

const PROMPTS_DIR = path.join(process.cwd(), "prompts");

/**
 * prompts/<name>.md を読み込み、フロントマター（version 必須）と本文に分離する。
 */
export function loadPrompt(name: string): LoadedPrompt {
  const file = path.join(PROMPTS_DIR, `${name}.md`);
  const raw = fs.readFileSync(file, "utf-8");
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) {
    throw new Error(`prompts/${name}.md にフロントマターがありません`);
  }
  const versionMatch = match[1].match(/^version:\s*(\S+)/m);
  if (!versionMatch) {
    throw new Error(`prompts/${name}.md のフロントマターに version がありません`);
  }
  return {
    version: versionMatch[1],
    name,
    body: raw.slice(match[0].length),
  };
}

/**
 * プレースホルダー（{{KEY}}）を展開する。未展開のまま残った場合はエラー
 * （プロンプトとコードの不整合を実行時に検知するため）。
 */
export function renderPrompt(
  body: string,
  vars: Record<string, string>
): string {
  let rendered = body;
  for (const [key, value] of Object.entries(vars)) {
    rendered = rendered.replaceAll(`{{${key}}}`, value);
  }
  const leftover = rendered.match(/\{\{[A-Z_]+\}\}/g);
  if (leftover) {
    throw new Error(`未展開のプレースホルダーがあります: ${leftover.join(", ")}`);
  }
  return rendered;
}
