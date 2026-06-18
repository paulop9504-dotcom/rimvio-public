/** Pull a won price from title/description when present. */
export function extractPriceHint(text: string | null | undefined): string | null {
  const won = parsePriceToWon(text);
  return won ? `${won.toLocaleString("ko-KR")}원` : null;
}

export function parsePriceToWon(text: string | null | undefined): number | null {
  if (!text?.trim()) {
    return null;
  }

  const wonMatch = text.match(/(\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+)\s*원/);
  if (wonMatch) {
    const value = Number.parseInt(wonMatch[1].replace(/,/g, ""), 10);
    return Number.isFinite(value) ? value : null;
  }

  const symbolMatch = text.match(/₩\s*(\d{1,3}(?:,\d{3})*|\d+)/);
  if (symbolMatch) {
    const value = Number.parseInt(symbolMatch[1].replace(/,/g, ""), 10);
    return Number.isFinite(value) ? value : null;
  }

  return null;
}

export function buildPriceSnapshotMessage(
  title: string | null,
  manualPrice?: string | null
) {
  const fromTitle = extractPriceHint(title);
  const price = manualPrice?.trim() || fromTitle;

  if (!price) {
    return null;
  }

  const label = title?.trim() ? `${title.trim()} · ${price}` : price;
  return label.slice(0, 120);
}
