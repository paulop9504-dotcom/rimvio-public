export type SpendReceiptPreview = {
  merchant: string;
  amountWon: number | null;
  headline: string;
};

export function parseSpendReceiptPreview(input: {
  signal?: string | null;
  title?: string | null;
}): SpendReceiptPreview | null {
  const signal = input.signal?.trim() ?? "";
  const title = input.title?.trim() ?? "";
  const combined = `${signal} ${title}`;

  if (!/영수증|receipt|🧾|결제|지출|합계/i.test(combined)) {
    return null;
  }

  const amountMatch = combined.match(/([\d,]+)\s*원/u);
  const amountWon = amountMatch
    ? Number.parseInt(amountMatch[1]!.replace(/,/g, ""), 10)
    : null;

  const merchant =
    title.replace(/🧾|영수증|receipt/gi, "").trim() ||
    signal
      .replace(/^[\s\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]+/u, "")
      .replace(/·.+/u, "")
      .trim() ||
    "지출";

  const headline =
    amountWon != null && !Number.isNaN(amountWon)
      ? `${amountWon.toLocaleString("ko-KR")}원`
      : "금액 확인";

  return { merchant, amountWon: amountWon != null && !Number.isNaN(amountWon) ? amountWon : null, headline };
}
