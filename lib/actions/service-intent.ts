import type { ExtensionContext } from "@/lib/actions/extension-catalog";
import { isCommerceDomain } from "@/lib/enrichers/url-intelligence";
import { isDeliveryUrl } from "@/lib/resolvers/delivery-deep-links";

export type ServiceIntent =
  | "beauty_wellness"
  | "cs_support"
  | "real_estate"
  | "professional"
  | "repair_install"
  | "mobility_auto"
  | "education_coaching"
  | "event_party"
  | "emergency_utility"
  | "freelancer_gig";

type IntentRule = {
  intent: ServiceIntent;
  pattern: RegExp;
  weight: number;
};

const INTENT_RULES: IntentRule[] = [
  {
    intent: "beauty_wellness",
    pattern:
      /미용|헤어|네일|피부(?:과|관)?|에스테|마사지|스파|왁싱|속눈|반영구|뷰티|두피|펌|염색|beauty|wellness|salon|nail|derma|hair|skin.?care/i,
    weight: 2,
  },
  {
    intent: "cs_support",
    pattern:
      /고객센터|고객.?센터|문의|cs|support|help|faq|교환|반품|배송.?문의|as센터|a\/s|claim|complaint|배송.?지연|주문.?오류|불량|하자|환불/i,
    weight: 2,
  },
  {
    intent: "real_estate",
    pattern:
      /부동산|집주인|관리(?:실|소)|전세|월세|매물|입주|임대|다방|직방|zigbang|dabang|r114|land\.naver|실거래|원룸|투룸|오피스텔|전월세|중개/i,
    weight: 2,
  },
  {
    intent: "professional",
    pattern:
      /변호|법률|세무|회계|상담|컨설|견적.?상담|lawyer|attorney|tax|consult|노무|patent|특허/i,
    weight: 2,
  },
  {
    intent: "repair_install",
    pattern:
      /수리|설치|출장.?기사|배관|에어컨|보일러|인테리어|렌탈.?청소|repair|install|plumb|hvac|as.?접수|가전.?고장|전기.?공사/i,
    weight: 2,
  },
  {
    intent: "mobility_auto",
    pattern:
      /고장|사고|타이어|펑크|견인|긴급출동|로드.?서비스|정비소|카센터|자동차.?수리|차량.?고장|보험.?출동|accident|tow|flat.?tire|roadside/i,
    weight: 2,
  },
  {
    intent: "education_coaching",
    pattern:
      /과외|학원|피트니스|헬스|요가|필라테스|레슨|체험.?수업|강사|코칭|튜터|tutor|lesson|fitness|guitar|piano|music.?class/i,
    weight: 2,
  },
  {
    intent: "event_party",
    pattern:
      /결혼|웨딩|돌잔치|돌.?잔치|대관|케이터링|연회|행사.?장|파티.?룸|베뉴|venue|wedding|banquet|catering|event.?hall/i,
    weight: 2,
  },
  {
    intent: "emergency_utility",
    pattern:
      /열쇠|도어락|분실|누수|전등|전기.?고장|긴급|24.?시|출장.?수리|비상|응급|emergency|locksmith|leak|blackout/i,
    weight: 2,
  },
  {
    intent: "freelancer_gig",
    pattern:
      /스냅|외주|포트폴리오|프리랜서|디자인.?의뢰|영상.?제작|촬영.?문의|견적.?요청|gig|freelance|portfolio|commission|creator/i,
    weight: 2,
  },
];

const BEAUTY_DOMAINS =
  /hair|nail|beauty|salon|treat|피부|네일|헤어|wax|spa|clinic|wellness/i;
const REAL_ESTATE_DOMAINS =
  /zigbang|dabang|r114|land\.naver|realtor|housing|apartment|office-tel/i;
const REPAIR_DOMAINS =
  /service\.samsung|lgservice|care\.lg|as\.|repair|fix|install|공식.?as/i;
const MOBILITY_DOMAINS =
  /insurance|현대해상|삼성화재|kb손해|메리츠|axa|car|auto|motors|tire|타이어/i;
const EDUCATION_DOMAINS =
  /academy|lesson|tutor|fitness|gym|yoga|pilates|학원|레슨/i;
const EVENT_DOMAINS =
  /wedding|venue|hall|party|banquet|케이터링|웨딩|연회/i;
const FREELANCER_DOMAINS =
  /portfolio|behance|notion|instagram|creator|design|snap|photo/i;

const ALL_INTENTS: ServiceIntent[] = [
  "emergency_utility",
  "mobility_auto",
  "beauty_wellness",
  "cs_support",
  "real_estate",
  "education_coaching",
  "event_party",
  "freelancer_gig",
  "professional",
  "repair_install",
];

function contextHaystack(ctx: ExtensionContext) {
  return [
    ctx.sourceUrl,
    ctx.domain,
    ctx.title ?? "",
    ctx.description ?? "",
  ].join(" ");
}

function scoreIntent(intent: ServiceIntent, haystack: string, ctx: ExtensionContext) {
  let score = 0;

  for (const rule of INTENT_RULES) {
    if (rule.intent !== intent) {
      continue;
    }
    if (rule.pattern.test(haystack)) {
      score += rule.weight;
    }
  }

  if (intent === "beauty_wellness" && BEAUTY_DOMAINS.test(ctx.domain)) {
    score += 2;
  }

  if (intent === "real_estate" && REAL_ESTATE_DOMAINS.test(ctx.domain + ctx.sourceUrl)) {
    score += 3;
  }

  if (intent === "repair_install" && REPAIR_DOMAINS.test(ctx.domain + ctx.sourceUrl)) {
    score += 2;
  }

  if (intent === "mobility_auto" && MOBILITY_DOMAINS.test(ctx.domain + ctx.sourceUrl)) {
    score += 2;
  }

  if (intent === "education_coaching" && EDUCATION_DOMAINS.test(ctx.domain + ctx.sourceUrl)) {
    score += 2;
  }

  if (intent === "event_party" && EVENT_DOMAINS.test(ctx.domain + ctx.sourceUrl)) {
    score += 2;
  }

  if (intent === "freelancer_gig" && FREELANCER_DOMAINS.test(ctx.domain + ctx.sourceUrl)) {
    score += 2;
  }

  if (intent === "cs_support") {
    if (isCommerceDomain(ctx.domain) || isDeliveryUrl(ctx.sourceUrl)) {
      score += 1;
    }
    if (/order|tracking|delivery|invoice|ship|claim|cs|support|faq|contact|help|as/i.test(ctx.sourceUrl)) {
      score += 2;
    }
  }

  if (intent === "emergency_utility" && /긴급|24.?시|응급|비상/i.test(haystack)) {
    score += 2;
  }

  if (intent === "mobility_auto" && /사고|견인|펑크|긴급.?출동/i.test(haystack)) {
    score += 2;
  }

  return score;
}

export function detectServiceIntent(ctx: ExtensionContext): ServiceIntent | null {
  const haystack = contextHaystack(ctx);
  let best: { intent: ServiceIntent; score: number } | null = null;

  for (const intent of ALL_INTENTS) {
    const score = scoreIntent(intent, haystack, ctx);
    if (score <= 0) {
      continue;
    }

    if (!best || score > best.score) {
      best = { intent, score };
    }
  }

  if (!best || best.score < 2) {
    return null;
  }

  return best.intent;
}
