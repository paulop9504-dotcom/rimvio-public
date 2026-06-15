/** Archive rollup context for feed link MAIN ranking. */
export function buildLinkRankingContextKey(input: {
  domain: string;
  category?: string | null;
}): string {
  const domain = input.domain.trim().toLowerCase() || "unknown";
  const category = input.category?.trim().toLowerCase() || "link";
  return `event.${category}.link:${domain}`;
}
