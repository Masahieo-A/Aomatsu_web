/**
 * 英文の語数カウントと「語数極小ガード」判定を行う（フロントと API の両方で利用）。
 */

/**
 * 英文の語数を数える
 * 連続する空白で分割し、空文字を除外したものをカウントする
 */
export function countWords(essay: string): number {
  return essay.trim().split(/\s+/).filter((w) => w.length > 0).length;
}

/**
 * 要求語数文字列から最小値を抽出する
 * 単一数字（"80"）→ 80
 * 範囲（"80-100"）→ 80
 */
export function parseRequiredMin(wordCountReq: string): number {
  const parts = wordCountReq.split("-");
  return parseInt(parts[0] ?? "0", 10);
}

/**
 * 語数極小ガード
 * @returns ブロックする場合はエラーメッセージ、通過する場合は null
 */
export function checkWordCountGuard(
  essay: string,
  wordCountReq: string
): string | null {
  const count = countWords(essay);
  const requiredMin = parseRequiredMin(wordCountReq);
  const threshold = Math.max(20, Math.ceil(requiredMin * 0.65));

  if (count < 20 || count < Math.ceil(requiredMin * 0.65)) {
    return `英文が短すぎます。もう少し書いてから送信してください。\n（現在: ${count}語 / 目安: ${threshold}語以上）`;
  }
  return null;
}
