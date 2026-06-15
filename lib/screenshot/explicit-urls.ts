/** Require literal http(s) URLs — avoids punycode false positives from OCR line noise. */
export function extractExplicitUrls(rawText: string): string[] {
  const matches = rawText.match(/https?:\/\/[^\s<>"')\]]+/gi) ?? [];
  const seen = new Set<string>();
  const results: string[] = [];

  for (const match of matches) {
    const trimmed = match.replace(/[.,;:!?)]+$/g, "").trim();
    if (!trimmed || seen.has(trimmed)) {
      continue;
    }

    try {
      results.push(new URL(trimmed).href);
      seen.add(trimmed);
    } catch {
      // Ignore malformed URL fragments in OCR noise.
    }
  }

  return results;
}
