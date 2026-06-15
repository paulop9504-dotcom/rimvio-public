const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "from",
  "with",
  "www",
  "com",
  "co",
  "kr",
  "중고",
  "판매",
  "직거래",
  "급처",
  "미개봉",
  "풀박",
]);

export function tokenizeForSimilarity(text: string | null | undefined) {
  if (!text?.trim()) {
    return [] as string[];
  }

  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length >= 2 && !STOP_WORDS.has(word));
}

/** Jaccard similarity 0–1 between two strings (token overlap). */
export function jaccardSimilarity(
  left: string | null | undefined,
  right: string | null | undefined
) {
  const leftTokens = tokenizeForSimilarity(left);
  const rightTokens = tokenizeForSimilarity(right);

  if (leftTokens.length === 0 || rightTokens.length === 0) {
    return 0;
  }

  const leftSet = new Set(leftTokens);
  const rightSet = new Set(rightTokens);
  let intersection = 0;

  for (const token of leftSet) {
    if (rightSet.has(token)) {
      intersection += 1;
    }
  }

  const union = leftSet.size + rightSet.size - intersection;
  return union === 0 ? 0 : intersection / union;
}
