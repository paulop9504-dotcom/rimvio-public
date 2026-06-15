import { parsePriceToWon } from "@/lib/links/extract-price-hint";

export function appendPriceToTitle(title: string | null, priceWon: number | null | undefined) {
  if (!title?.trim() || !priceWon || priceWon <= 0) {
    return title;
  }

  if (parsePriceToWon(title)) {
    return title;
  }

  return `${title.trim()} ${priceWon.toLocaleString("ko-KR")}원`;
}
