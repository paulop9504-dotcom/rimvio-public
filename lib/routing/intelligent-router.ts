import type { LinkCategory } from "@/lib/categories/types";
import type { EnrichedLink } from "@/lib/enrichers/types";

/** Action mode chosen after category scoring. */
export type RouteMode =
  | "commerce_compare"
  | "news_summary"
  | "map_navigate"
  | "media_play"
  | "generic"
  | "ask_user";

export type RouteScore = {
  category: LinkCategory;
  score: number;
};

export type RouterInput = {
  url: string;
  domain: string;
  title?: string | null;
  description?: string | null;
  source_type?: EnrichedLink["source_type"];
};

export type RouterResult = {
  scores: RouteScore[];
  winner: LinkCategory;
  confidence: number;
  mode: RouteMode;
  needsFallback: boolean;
};

export const ROUTE_CONFIDENCE_THRESHOLD = 0.5;

type DomainRule = {
  pattern: RegExp;
  category: LinkCategory;
  mode: RouteMode;
  score: number;
};

type SignalRule = {
  pattern: RegExp;
  category: LinkCategory;
  weight: number;
  mode?: RouteMode;
};

const DOMAIN_RULES: DomainRule[] = [
  {
    pattern: /joongna|junggo|bunjang|daangn|karrotmarket|karrot/i,
    category: "shopping",
    mode: "commerce_compare",
    score: 0.95,
  },
  {
    pattern: /coupang(?!.*eats)|gmarket|11st|musinsa|smartstore|shopping\.naver|ssg|lotte|auction|tmon|zigzag|ably|kurly|oliveyoung/i,
    category: "shopping",
    mode: "commerce_compare",
    score: 0.9,
  },
  {
    pattern: /youtube|youtu\.be|netflix|tving|wavve|disneyplus|spotify|twitch/i,
    category: "media",
    mode: "media_play",
    score: 0.92,
  },
  {
    pattern: /dorojuso\.kr|juso\.go\.kr/i,
    category: "travel",
    mode: "map_navigate",
    score: 0.92,
  },
  {
    pattern: /map\.naver|map\.kakao|google\.com\/maps|kakao\.com\/local|place\.naver/i,
    category: "travel",
    mode: "map_navigate",
    score: 0.9,
  },
  {
    pattern: /news\.naver|news\.daum|yna\.co\.kr|mk\.co\.kr|hankyung|chosun|joongang|donga|hani|khan|bloter|techcrunch|reuters|bloomberg/i,
    category: "research",
    mode: "news_summary",
    score: 0.88,
  },
  {
    pattern: /instagram|twitter|x\.com|facebook|tiktok|threads|blog\.naver|cafe\.naver|tistory|brunch|medium|substack/i,
    category: "social",
    mode: "generic",
    score: 0.75,
  },
];

const URL_SIGNALS: SignalRule[] = [
  {
    pattern: /\/(news|article|post|story|press|editorial|opinion|column)\//i,
    category: "research",
    weight: 0.35,
    mode: "news_summary",
  },
  {
    pattern: /\/(product|products|goods|item|deal|shop|buy|sell|market)\//i,
    category: "shopping",
    weight: 0.35,
    mode: "commerce_compare",
  },
  {
    pattern: /\/(place|map|spot|hotel|flight|trip|tour)\//i,
    category: "travel",
    weight: 0.3,
    mode: "map_navigate",
  },
  {
    pattern: /\/(watch|video|clip|live|shorts)\//i,
    category: "media",
    weight: 0.3,
    mode: "media_play",
  },
];

const KEYWORD_SIGNALS: SignalRule[] = [
  {
    pattern: /중고|직거래|판매|구매|무료배송|택배|네고|가격|원\b|₩|만원|최저|할인|쿠폰|상품|product|price|deal|used|marketplace/i,
    category: "shopping",
    weight: 0.25,
    mode: "commerce_compare",
  },
  {
    pattern: /뉴스|기사|속보|칼럼|editorial|breaking|report|analysis|headline|press release/i,
    category: "research",
    weight: 0.25,
    mode: "news_summary",
  },
  {
    pattern: /맛집|카페|호텔|항공|여행|일정|관광|예약|숙소|일몰|일출|sunset|sunrise|beach|landmark|itinerary|hotel|flight|map|길찾|oia|santorini|해변|리조트|온천|스키|캠핑/i,
    category: "travel",
    weight: 0.2,
    mode: "map_navigate",
  },
  {
    pattern: /영상|클립|라이브|shorts|episode|playlist|podcast|stream/i,
    category: "media",
    weight: 0.2,
    mode: "media_play",
  },
  {
    pattern: /github|docs|wiki|paper|arxiv|tutorial|guide|manual|api reference/i,
    category: "research",
    weight: 0.15,
  },
];

const SOURCE_TYPE_BOOST: Partial<
  Record<EnrichedLink["source_type"], { category: LinkCategory; weight: number; mode?: RouteMode }>
> = {
  commerce: { category: "shopping", weight: 0.45, mode: "commerce_compare" },
  youtube: { category: "media", weight: 0.45, mode: "media_play" },
  ott: { category: "media", weight: 0.45, mode: "media_play" },
  ticket: { category: "media", weight: 0.35, mode: "generic" },
  map: { category: "travel", weight: 0.45, mode: "map_navigate" },
  transport: { category: "travel", weight: 0.4, mode: "map_navigate" },
  naver: { category: "social", weight: 0.25, mode: "generic" },
  github: { category: "research", weight: 0.4, mode: "generic" },
  portal: { category: "uncategorized", weight: 0.2, mode: "generic" },
};

const ALL_CATEGORIES: LinkCategory[] = [
  "shopping",
  "travel",
  "media",
  "research",
  "social",
  "uncategorized",
];

function normalizeDomain(domain: string) {
  return domain.trim().toLowerCase().replace(/^www\./, "");
}

function emptyScores(): Record<LinkCategory, number> {
  return {
    shopping: 0.08,
    travel: 0.08,
    media: 0.08,
    research: 0.08,
    social: 0.08,
    uncategorized: 0.08,
  };
}

function addScore(
  bucket: Record<LinkCategory, number>,
  category: LinkCategory,
  weight: number
) {
  bucket[category] = Math.min(1, bucket[category] + weight);
}

function normalizeScores(bucket: Record<LinkCategory, number>): RouteScore[] {
  const total = ALL_CATEGORIES.reduce((sum, key) => sum + bucket[key], 0) || 1;

  return ALL_CATEGORIES.map((category) => ({
    category,
    score: Number((bucket[category] / total).toFixed(4)),
  })).sort((left, right) => right.score - left.score);
}

function inferMode(
  winner: LinkCategory,
  domainMode: RouteMode | null,
  signalModes: RouteMode[]
): RouteMode {
  if (domainMode) {
    return domainMode;
  }

  const modeCounts = new Map<RouteMode, number>();
  for (const mode of signalModes) {
    modeCounts.set(mode, (modeCounts.get(mode) ?? 0) + 1);
  }

  const rankedModes = [...modeCounts.entries()].sort(
    (left, right) => right[1] - left[1]
  );
  if (rankedModes.length > 0) {
    return rankedModes[0][0];
  }

  switch (winner) {
    case "shopping":
      return "commerce_compare";
    case "research":
      return "news_summary";
    case "travel":
      return "map_navigate";
    case "media":
      return "media_play";
    default:
      return "generic";
  }
}

function matchDomainRule(domain: string, url: string): DomainRule | null {
  const target = `${domain} ${url}`.toLowerCase();

  for (const rule of DOMAIN_RULES) {
    if (rule.pattern.test(target)) {
      return rule;
    }
  }

  return null;
}

/**
 * Score link intent from URL + metadata — deterministic, no LLM.
 */
export function routeLink(input: RouterInput): RouterResult {
  const domain = normalizeDomain(input.domain);
  const haystack = [input.url, domain, input.title ?? "", input.description ?? ""]
    .join(" ")
    .trim();
  const bucket = emptyScores();
  const signalModes: RouteMode[] = [];
  let domainMode: RouteMode | null = null;

  const domainRule = matchDomainRule(domain, input.url);
  if (domainRule) {
    bucket[domainRule.category] = domainRule.score;
    domainMode = domainRule.mode;
    for (const category of ALL_CATEGORIES) {
      if (category !== domainRule.category) {
        bucket[category] *= 0.35;
      }
    }
  }

  for (const signal of URL_SIGNALS) {
    if (signal.pattern.test(input.url)) {
      addScore(bucket, signal.category, signal.weight);
      if (signal.mode) {
        signalModes.push(signal.mode);
      }
    }
  }

  for (const signal of KEYWORD_SIGNALS) {
    if (signal.pattern.test(haystack)) {
      addScore(bucket, signal.category, signal.weight);
      if (signal.mode) {
        signalModes.push(signal.mode);
      }
    }
  }

  if (input.source_type) {
    const boost = SOURCE_TYPE_BOOST[input.source_type];
    if (boost) {
      addScore(bucket, boost.category, boost.weight);
      if (boost.mode) {
        signalModes.push(boost.mode);
      }
    }
  }

  const scores = normalizeScores(bucket);
  const winner = scores[0]?.category ?? "uncategorized";
  const confidence = scores[0]?.score ?? 0;
  let mode = inferMode(winner, domainMode, signalModes);

  if (confidence < ROUTE_CONFIDENCE_THRESHOLD) {
    mode = "ask_user";
  }

  return {
    scores,
    winner,
    confidence,
    mode,
    needsFallback: confidence < ROUTE_CONFIDENCE_THRESHOLD,
  };
}

export function readRoutePayload(payload: Record<string, unknown> | undefined) {
  if (!payload) {
    return null;
  }

  const mode = payload.routeMode;
  const confidence = payload.routeConfidence;
  const winner = payload.routeWinner;
  const needsFallback = payload.routeNeedsFallback;

  if (
    typeof mode !== "string" ||
    typeof confidence !== "number" ||
    typeof winner !== "string"
  ) {
    return null;
  }

  return {
    mode: mode as RouteMode,
    confidence,
    winner: winner as LinkCategory,
    needsFallback: Boolean(needsFallback),
  };
}
