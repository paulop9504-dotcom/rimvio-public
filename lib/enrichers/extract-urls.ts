const URL_IN_TEXT = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi;

function stripTrailingPunctuation(value: string) {
  return value.replace(/[)\]}>,.!?;:'"]+$/g, "");
}

export function extractUrlsFromText(text: string | null | undefined): string[] {
  if (!text?.trim()) {
    return [];
  }

  const matches = text.match(URL_IN_TEXT) ?? [];
  const seen = new Set<string>();

  for (const match of matches) {
    const cleaned = stripTrailingPunctuation(match.trim());

    try {
      const normalized = new URL(cleaned).href;
      if (!seen.has(normalized)) {
        seen.add(normalized);
      }
    } catch {
      // Skip invalid URLs.
    }
  }

  return [...seen];
}

export function hostnameFromUrl(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "link";
  }
}
