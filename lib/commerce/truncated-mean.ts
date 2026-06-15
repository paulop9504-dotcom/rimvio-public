export type TruncatedMeanResult = {
  count: number;
  average: number | null;
  median: number | null;
  minSafe: number | null;
  maxSafe: number | null;
};

export function computeTruncatedMean(
  prices: number[],
  trimRatio = 0.1
): TruncatedMeanResult {
  const sorted = prices.filter((price) => Number.isFinite(price) && price > 0).sort(
    (left, right) => left - right
  );

  if (sorted.length === 0) {
    return {
      count: 0,
      average: null,
      median: null,
      minSafe: null,
      maxSafe: null,
    };
  }

  if (sorted.length < 5) {
    const average = sorted.reduce((sum, price) => sum + price, 0) / sorted.length;
    const median = sorted[Math.floor(sorted.length / 2)] ?? null;

    return {
      count: sorted.length,
      average,
      median,
      minSafe: sorted[0] ?? null,
      maxSafe: sorted[sorted.length - 1] ?? null,
    };
  }

  const trimCount = Math.max(1, Math.floor(sorted.length * trimRatio));
  const safe = sorted.slice(trimCount, sorted.length - trimCount);

  if (safe.length === 0) {
    return computeTruncatedMean(sorted, 0);
  }

  const average = safe.reduce((sum, price) => sum + price, 0) / safe.length;
  const median = safe[Math.floor(safe.length / 2)] ?? null;

  return {
    count: safe.length,
    average,
    median,
    minSafe: safe[0] ?? null,
    maxSafe: safe[safe.length - 1] ?? null,
  };
}
