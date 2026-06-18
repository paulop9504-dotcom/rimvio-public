/** Normalize meal contract utterances into place-discovery queries. */
export function toMealDiscoveryQuery(message: string): string {
  const trimmed = message.trim();
  if (!trimmed) {
    return trimmed;
  }

  if (/(?:맛집|식당|레스토랑|음식점)/u.test(trimmed)) {
    return trimmed;
  }

  if (
    /(?:점심|저녁|브런치|야식|식사|끼니)/u.test(trimmed) &&
    /(?:추천|찾|알려|골라)/u.test(trimmed)
  ) {
    return trimmed.replace(/추천/u, "맛집 추천");
  }

  return `${trimmed} 맛집 추천`;
}
