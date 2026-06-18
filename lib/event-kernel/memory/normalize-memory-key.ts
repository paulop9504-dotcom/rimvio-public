/** Normalize entity/intent keys for deduplication (§3 Rule 3). */
export function normalizeMemoryKey(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/(?:점|역|동|구|시|군|도)\s*$/u, "")
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .trim();
}

export function memoryKeysMatch(a: string, b: string): boolean {
  const left = normalizeMemoryKey(a);
  const right = normalizeMemoryKey(b);
  if (!left || !right) {
    return false;
  }
  if (left === right) {
    return true;
  }
  return left.includes(right) || right.includes(left);
}
