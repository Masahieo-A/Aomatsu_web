import { createHash } from "node:crypto";

/** 英文を正規化して SHA-256 を取る（キャッシュキー / S-04）。
 *  大文字小文字・前後空白・連続空白の揺れを吸収する。 */
export function sentenceHash(sentence: string): string {
  const normalized = sentence.trim().replace(/\s+/g, " ").toLowerCase();
  return createHash("sha256").update(normalized, "utf8").digest("hex");
}
