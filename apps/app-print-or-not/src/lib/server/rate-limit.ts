// 簡易レート制限（メモリ内）。サーバーレス環境ではインスタンスごとに数えるため、
// 厳密な上限ではなく「連打・総当たりを鈍らせる」ためのもの。
interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

function prune(now: number) {
  if (buckets.size < 5000) return;
  for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
}

/** 上限内なら true（カウントを1つ進める）。超過なら false。 */
export function allowRequest(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  prune(now);
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (b.count >= limit) return false;
  b.count += 1;
  return true;
}
