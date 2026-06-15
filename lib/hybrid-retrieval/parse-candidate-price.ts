/** Parse formatted KRW price strings from retrieval candidates. */
export function parseCandidatePriceKrw(price?: string): number | null {
  if (!price) {
    return null;
  }

  const digits = price.replace(/[^\d]/gu, "");
  if (!digits) {
    return null;
  }

  const value = Number.parseInt(digits, 10);
  return Number.isFinite(value) && value > 0 ? value : null;
}
