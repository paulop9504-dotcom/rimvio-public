import { parsePriceToWon } from "@/lib/links/extract-price-hint";
import { PRODUCT_SIGNAL } from "@/lib/capture/classify-legacy-place-product";
import { isTechListingTitle } from "@/lib/commerce/tech-category";
import { isCommerceDomain } from "@/lib/enrichers/url-intelligence";
import { isSecondhandDomain } from "@/lib/commerce/commerce-cleaner";

const COMMERCE_OCR_HINT =
  /joongna|junggo|bunjang|daangn|karrot|중고|직거래|급처|네고|coupang|쿠팡|gmarket|11st|musinsa|smartstore|shopping\.naver/i;

/** Skip Gemini vision when OCR already looks like a priced commerce capture. */
export function shouldSkipCaptureGemini(ocrText: string) {
  const text = ocrText.trim();
  if (text.length < 8) {
    return false;
  }

  const listingPrice = parsePriceToWon(text);
  if (!listingPrice || listingPrice < 10_000) {
    return false;
  }

  if (isTechListingTitle(text, null)) {
    return true;
  }

  if (PRODUCT_SIGNAL.test(text)) {
    return true;
  }

  return COMMERCE_OCR_HINT.test(text);
}

export function isKnownCommerceUrl(input: {
  url: string;
  domain: string;
}) {
  const blob = `${input.url} ${input.domain}`.toLowerCase();

  if (isSecondhandDomain(input.domain) || isCommerceDomain(input.domain)) {
    return true;
  }

  return /\/product|\/vp\/products|\/goods|shopping\.naver|smartstore/i.test(blob);
}
