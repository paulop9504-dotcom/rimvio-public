import type { LinkRow } from "@/types/database";
import type { CaptureIntentKind } from "@/lib/capture/capture-intent-types";
import { getDisplayTitleForLink } from "@/lib/feed/sanitize-link-title";

export type DomainKey =
  | "dining"
  | "travel"
  | "shopping"
  | "productivity"
  | "home_admin"
  | "health"
  | "public"
  | "transit"
  | "generic";

const DOMAIN_PATTERNS: Array<{ domain: DomainKey; pattern: RegExp }> = [
  { domain: "health", pattern: /병원|응급|약국|처방|건강|응급실|119|심평원|자가\s*진단/i },
  { domain: "public", pattern: /등본|초본|정부24|gov24|세금|홈택스|위택스|인증서|주민센터/i },
  { domain: "transit", pattern: /주유|하이패스|hipass|막차|첫차|택시|tmap|티맵|대중교통|지하철/i },
  {
    domain: "home_admin",
    pattern: /분리수거|주차\s*위치|구독|정기\s*결제|도시가스|한전|전기\s*요금|관리비/i,
  },
  {
    domain: "productivity",
    pattern: /영수증|receipt|청구|pdf|요약|메일\s*보내|문서/i,
  },
  { domain: "dining", pattern: /맛집|카페|식당|레스토랑|웨이팅|캐치테이블|배민|메뉴/i },
  { domain: "travel", pattern: /여행|항공|숙소|호텔|일정|체크인|yanolja|airbnb|booking/i },
  { domain: "shopping", pattern: /쇼핑|구매|배송|택배|쿠폰|최저가|danawa|쿠팡|장바구니/i },
];

const CAPTURE_KIND_DOMAIN: Partial<Record<CaptureIntentKind, DomainKey>> = {
  menu_food: "dining",
  place: "dining",
  address: "dining",
  travel_booking: "travel",
  ticket: "travel",
  product: "shopping",
  receipt: "productivity",
  parking: "home_admin",
  medicine: "health",
};

const LINK_CATEGORY_DOMAIN: Partial<Record<string, DomainKey>> = {
  food: "dining",
  travel: "travel",
  shopping: "shopping",
  health: "health",
};

export function resolveDomainKey(input: {
  link?: Pick<LinkRow, "category" | "title" | "domain" | "original_url"> | null;
  captureKind?: CaptureIntentKind | string | null;
  message?: string | null;
}): DomainKey {
  const title = input.link ? getDisplayTitleForLink(input.link) ?? "" : "";
  const combined = `${input.message ?? ""} ${title} ${input.link?.original_url ?? ""}`;

  if (input.captureKind && CAPTURE_KIND_DOMAIN[input.captureKind as CaptureIntentKind]) {
    return CAPTURE_KIND_DOMAIN[input.captureKind as CaptureIntentKind]!;
  }

  if (input.link?.category && LINK_CATEGORY_DOMAIN[input.link.category]) {
    return LINK_CATEGORY_DOMAIN[input.link.category]!;
  }

  for (const entry of DOMAIN_PATTERNS) {
    if (entry.pattern.test(combined)) {
      return entry.domain;
    }
  }

  return "generic";
}

export function domainBlocksOtherDomains(active: DomainKey, candidate: DomainKey) {
  if (active === "generic" || candidate === "generic") {
    return false;
  }
  return active !== candidate;
}

export function domainLabel(domain: DomainKey) {
  const labels: Record<DomainKey, string> = {
    dining: "맛집·카페",
    travel: "여행·일정",
    shopping: "쇼핑·상품",
    productivity: "생산성·영수증",
    home_admin: "생활 행정",
    health: "건강·응급",
    public: "공공 서비스",
    transit: "자동차·교통",
    generic: "일반",
  };
  return labels[domain];
}
