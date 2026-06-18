import type { SmartSuite } from "@/lib/actions/smart-suite-types";
import type { ExtensionContext } from "@/lib/actions/extension-catalog";
import {
  chronoBoostedSuites,
  resolveChronoBand,
} from "@/lib/actions/chrono-suite-actions";
import type { SuiteWeights } from "@/lib/enrichers/types";

const MIN_LINKS_FOR_SUITE_PROFILE = 4;
const MIN_WEIGHT_FOR_DEFAULT_SUITE = 0.32;

type SuiteSignal = {
  suite: SmartSuite;
  pattern: RegExp;
  weight: number;
};

const SUITE_SIGNALS: SuiteSignal[] = [
  {
    suite: "finance",
    pattern:
      /finance|investing|coinmarketcap|upbit|bithumb|binance|krx|fnguide|38\.co\.kr|seekingalpha|bloomberg|reuters|주식|코인|crypto|bitcoin|etf|배당|재테크|증권|종목|금리|증시|stock|invest/i,
    weight: 2,
  },
  {
    suite: "travel",
    pattern:
      /trip\.|booking|airbnb|agoda|hotels|skyscanner|klook|yanolja|goodchoice|airline|항공|호텔|여행|일정|맛집|관광|flight|hotel|itinerary|planner/i,
    weight: 2,
  },
  {
    suite: "edu",
    pattern:
      /coursera|udemy|khan|arxiv|scholar|\.edu|university|lecture|pdf|inflearn|class101|강의|논문|학습|교재|스터디|exam|course|tutorial|인강/i,
    weight: 2,
  },
  {
    suite: "home_life",
    pattern:
      /manual|support\.|service\.|lg\.com|samsung|diy|repair|interior|ikea|매뉴얼|수리|인테리어|가전|as센터|a\/s|설치|부품|appliance|home.?depot/i,
    weight: 2,
  },
  {
    suite: "social",
    pattern:
      /linkedin|meetup|eventbrite|luma|vcard|명함|네트워킹|미팅|회의|초대|networking|contact|instagram|facebook|twitter|x\.com/i,
    weight: 2,
  },
  {
    suite: "career",
    pattern:
      /wanted|saramin|jobkorea|linkedin\.com\/jobs|careers|recruit|채용|지원|공고|hiring|resume|cv/i,
    weight: 2,
  },
  {
    suite: "legal_admin",
    pattern:
      /terms|policy|privacy|약관|계약|gov\.kr|go\.kr|법률|고시|신청|행정|복지|세금|마감|접수/i,
    weight: 2,
  },
  {
    suite: "health",
    pattern:
      /workout|홈트|운동|헬스|yoga|필라테스|diet|영양|칼로리|recipe|식단|nutrition|fitness|health/i,
    weight: 2,
  },
  {
    suite: "design",
    pattern:
      /behance|dribbble|pinterest|figma|unsplash|pexels|freepik|design|portfolio|ui.?ux|mockup|레퍼런스/i,
    weight: 2,
  },
  {
    suite: "intellectual",
    pattern:
      /news|뉴스|칼럼|기사|blog|post|article|medium|brunch|tistory|wiki|논문|paper|arxiv|editorial|report/i,
    weight: 1,
  },
  {
    suite: "decision",
    pattern:
      /menu|메뉴|review|후기|공연|티켓|예매|concert|festival|booking|restaurant|맛집|쇼핑|상품/i,
    weight: 1,
  },
  {
    suite: "execution",
    pattern:
      /견적|상담|문의|quote|estimate|professional|외주|freelance|portfolio|commission/i,
    weight: 1,
  },
];

const ALL_SUITES: SmartSuite[] = [
  "legal_admin",
  "finance",
  "career",
  "health",
  "travel",
  "edu",
  "home_life",
  "social",
  "design",
  "decision",
  "intellectual",
  "execution",
];

function linkHaystack(link: {
  original_url: string;
  title?: string | null;
  domain?: string | null;
  category?: string | null;
}) {
  return [
    link.original_url,
    link.domain ?? "",
    link.title ?? "",
    link.category ?? "",
  ].join(" ");
}

export function scoreSuiteFromContext(ctx: ExtensionContext, suite: SmartSuite) {
  const haystack = [
    ctx.sourceUrl,
    ctx.domain,
    ctx.title ?? "",
    ctx.description ?? "",
  ].join(" ");

  let score = 0;

  for (const signal of SUITE_SIGNALS) {
    if (signal.suite !== suite) {
      continue;
    }

    if (signal.pattern.test(haystack)) {
      score += signal.weight;
    }
  }

  return score;
}

export function aggregateSuiteWeights(
  links: {
    original_url: string;
    title?: string | null;
    domain?: string | null;
    category?: string | null;
  }[],
  options?: { maxLinks?: number }
): SuiteWeights {
  const maxLinks = options?.maxLinks ?? 40;
  const recent = links.slice(0, maxLinks);

  if (recent.length < MIN_LINKS_FOR_SUITE_PROFILE) {
    return {};
  }

  const totals = Object.fromEntries(
    ALL_SUITES.map((suite) => [suite, 0])
  ) as Record<SmartSuite, number>;

  for (const link of recent) {
    const haystack = linkHaystack(link);

    for (const signal of SUITE_SIGNALS) {
      if (signal.pattern.test(haystack)) {
        totals[signal.suite] += signal.weight;
      }
    }
  }

  const grandTotal = Object.values(totals).reduce((sum, value) => sum + value, 0);
  if (grandTotal <= 0) {
    return {};
  }

  const weights: SuiteWeights = {};
  for (const suite of ALL_SUITES) {
    const value = totals[suite] / grandTotal;
    if (value > 0) {
      weights[suite] = value;
    }
  }

  return weights;
}

export function suggestDefaultSuite(weights?: SuiteWeights | null): SmartSuite | null {
  if (!weights) {
    return null;
  }

  let best: SmartSuite | null = null;
  let bestWeight = MIN_WEIGHT_FOR_DEFAULT_SUITE;

  for (const suite of ALL_SUITES) {
    const weight = weights[suite] ?? 0;
    if (weight > bestWeight) {
      best = suite;
      bestWeight = weight;
    }
  }

  return best;
}

export function describeSuiteBias(weights: SuiteWeights): string | null {
  const dominant = suggestDefaultSuite(weights);
  if (!dominant) {
    return null;
  }

  const pct = Math.round((weights[dominant] ?? 0) * 100);
  const labels: Partial<Record<SmartSuite, string>> = {
    finance: "금융",
    travel: "여행",
    edu: "학습",
    home_life: "홈/라이프",
    social: "네트워킹",
    career: "커리어",
    legal_admin: "행정/법률",
    health: "건강",
    design: "디자인",
    intellectual: "리서치",
    decision: "결정",
    execution: "실행",
  };

  return `Inbox ${pct}% ${labels[dominant] ?? dominant} — Suite 기본값에 반영`;
}

export function rankSmartSuites(
  detected: SmartSuite[],
  ctx: ExtensionContext
): SmartSuite[] {
  const weights = ctx.suiteWeights ?? {};
  const pinned = ctx.pinnedSuites ?? [];
  const pinnedSet = new Set(pinned);
  const dominant = suggestDefaultSuite(weights);
  const merged = new Set<SmartSuite>(detected);
  const hour =
    typeof ctx.hour === "number" && ctx.hour >= 0 && ctx.hour <= 23
      ? ctx.hour
      : new Date().getHours();
  const chronoBoost = new Set(chronoBoostedSuites(resolveChronoBand(hour)));

  if (dominant) {
    const contextScore = scoreSuiteFromContext(ctx, dominant);
    if (contextScore > 0 || detected.length === 0) {
      merged.add(dominant);
    }
  }

  for (const suite of chronoBoost) {
    if (scoreSuiteFromContext(ctx, suite) > 0 || detected.includes(suite)) {
      merged.add(suite);
    }
  }

  for (const suite of pinned) {
    merged.add(suite);
  }

  return [...merged].sort((left, right) => {
    const leftPinned = pinnedSet.has(left);
    const rightPinned = pinnedSet.has(right);
    if (leftPinned !== rightPinned) {
      return leftPinned ? -1 : 1;
    }

    if (leftPinned && rightPinned) {
      return pinned.indexOf(left) - pinned.indexOf(right);
    }

    const leftDominant = dominant && left === dominant ? 1 : 0;
    const rightDominant = dominant && right === dominant ? 1 : 0;
    if (rightDominant !== leftDominant) {
      return rightDominant - leftDominant;
    }

    const leftChrono = chronoBoost.has(left) ? 1 : 0;
    const rightChrono = chronoBoost.has(right) ? 1 : 0;
    if (rightChrono !== leftChrono) {
      return rightChrono - leftChrono;
    }

    const weightDelta = (weights[right] ?? 0) - (weights[left] ?? 0);
    if (Math.abs(weightDelta) > 0.04) {
      return weightDelta;
    }

    const contextDelta =
      scoreSuiteFromContext(ctx, right) - scoreSuiteFromContext(ctx, left);
    if (contextDelta !== 0) {
      return contextDelta;
    }

    return detected.indexOf(left) - detected.indexOf(right);
  });
}
