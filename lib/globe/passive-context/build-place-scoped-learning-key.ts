/** Place-scoped rollup key for cross-trip pattern learning (e.g. 상하이). */
export function buildPlaceScopedLearningContextKey(
  place: string | null | undefined,
): string | null {
  const normalized = place?.trim().toLowerCase().replace(/\s+/g, " ");
  if (!normalized || normalized.includes("°")) {
    return null;
  }
  return `place.${normalized.replace(/\s/g, "_")}`;
}
