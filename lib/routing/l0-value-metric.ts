import { buildTrueCostReceipt } from "@/lib/commerce/true-cost-receipt";
import type { MarketVerdict } from "@/lib/commerce/market-price";
import type { CaptureIntentKind } from "@/lib/capture/capture-intent-types";
import { estimateReadingMinutesFromText } from "@/lib/media/estimate-reading-time";
import { parsePriceToWon } from "@/lib/links/extract-price-hint";
import { buildCommerceVerdictSubline } from "@/lib/commerce/commerce-verdict-presentation";

/** Optional market context when caller already fetched 시세 snapshot. */
export type L0ValueMarketContext = {
  listingPrice?: number | null;
  medianPrice?: number | null;
  verdict?: MarketVerdict | null;
};

/** STUDY — time saved vs reading full text. */
export function studyLossPreventionMetric(text: string) {
  const minutes = estimateReadingMinutesFromText(text);
  if (minutes && minutes >= 3) {
    const saved = Math.max(1, minutes - 1);
    return `이 요약으로 아낀 시간: 약 ${saved}분`;
  }

  return "이 요약으로 아낀 시간: 약 5분";
}

export function medicalLossPreventionMetric() {
  return "잘못 복용·누락 시 손해 — 30초 요약으로 확인";
}

export function financeLossPreventionMetric(
  title: string,
  listingPrice?: number | null
) {
  const price = listingPrice ?? parsePriceToWon(title);

  if (price && price > 0) {
    return `지출 ${price.toLocaleString("ko-KR")}원 미기록 시 손해 가능`;
  }

  return "지출 미기록·환급 놓치면 손해";
}

export function shoppingLossPreventionMetric(
  title: string,
  domain?: string | null,
  listingPrice?: number | null,
  market?: L0ValueMarketContext | null
) {
  const parsedListing =
    listingPrice ?? parsePriceToWon(title) ?? market?.listingPrice ?? null;

  const subline = buildCommerceVerdictSubline({
    listingPrice: parsedListing,
    medianPrice: market?.medianPrice,
    verdict: market?.verdict,
    trueCost: buildTrueCostReceipt({
      title,
      domain,
      surfacePrice: parsedListing ?? undefined,
    }),
  });

  if (subline) {
    return subline;
  }

  return "비교 없이 구매 — 손해 볼 수 있음";
}

export function foodLossPreventionMetric() {
  return "맛집 헛걸음 방지 — 메뉴·위치 미리 확인";
}

export function otherLossPreventionMetric(kind?: CaptureIntentKind | null) {
  switch (kind) {
    case "wifi_qr":
      return "비밀번호 못 찾으면 시간 손해 — 즉시 연결";
    case "business_card":
      return "연락처 놓치면 기회 손해 — 바로 저장";
    case "ticket":
      return "일정 놓치면 손해 — 티켓 정보 확인";
    case "travel_booking":
      return "예약 정보 놓치면 손해 — 한눈에 확인";
    default:
      return "정보 놓치면 손해 — 1-Tap으로 확인";
  }
}
