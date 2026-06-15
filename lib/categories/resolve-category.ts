import type { LinkCategory } from "@/lib/categories/types";
import { getPortalSuite } from "@/lib/enrichers/portal-action-suites";
import { resolvePortalSuiteKey } from "@/lib/enrichers/portal-home";
import type { EnrichedLink } from "@/lib/enrichers/types";
import { resolveCategoryFromRouting } from "@/lib/routing/apply-routing";

const SOURCE_TYPE_CATEGORY: Record<
  EnrichedLink["source_type"],
  LinkCategory | "domain" | "portal"
> = {
  youtube: "media",
  ott: "media",
  ticket: "media",
  naver: "social",
  commerce: "shopping",
  kakao: "social",
  map: "travel",
  transport: "travel",
  delivery: "uncategorized",
  github: "research",
  portal: "portal",
  generic: "domain",
};

type DomainRule = {
  pattern: RegExp;
  category: LinkCategory;
};

/** First match wins. Used only for generic enricher fallback. */
const DOMAIN_CATEGORY_RULES: DomainRule[] = [
  {
    pattern:
      /youtube|youtu\.be|netflix|tving|wavve|disneyplus|watcha|coupangplay|tver|vimeo|twitch|spotify/i,
    category: "media",
  },
  {
    pattern:
      /ticket\.interpark|ticket\.melon|ticket\.yes24|ticketlink|interpark\.com\/ticket/i,
    category: "media",
  },
  {
    pattern:
      /blog\.naver|cafe\.naver|news\.naver|place\.naver|naver\.me/i,
    category: "social",
  },
  {
    pattern:
      /instagram|twitter|x\.com|facebook|tiktok|threads|open\.kakao|pf\.kakao|kakao\.com\/talk/i,
    category: "social",
  },
  {
    pattern:
      /baemin|yogiyo|coupang.*eats|eats\.coupang/i,
    category: "uncategorized",
  },
  {
    pattern:
      /amazon|coupang(?!.*eats)|gmarket|11st|musinsa|yo-go|ssg|lotte|shopify|smartstore|joongna|junggo|bunjang|daangn|karrot/i,
    category: "shopping",
  },
  {
    pattern:
      /map\.naver|map\.kakao|google\.com\/maps|airbnb|booking|agoda|trip\.com|hotels|expedia|klook|yanolja|goodchoice/i,
    category: "travel",
  },
  {
    pattern:
      /github|gitlab|stackoverflow|notion|figma|linear|arxiv|wikipedia|medium|substack|docs\.|stripe\.com\/docs/i,
    category: "research",
  },
];

function resolveFromDomain(domain: string, url: string): LinkCategory {
  const target = `${domain} ${url}`.toLowerCase();

  for (const rule of DOMAIN_CATEGORY_RULES) {
    if (rule.pattern.test(target)) {
      return rule.category;
    }
  }

  return "uncategorized";
}

/**
 * Deterministic category from enricher output — no LLM.
 */
function resolvePortalCategory(enriched: EnrichedLink): LinkCategory {
  const suiteKey = resolvePortalSuiteKey(enriched.url);
  const suite = suiteKey ? getPortalSuite(suiteKey) : null;

  if (!suite || suite.actions.length === 0) {
    return "uncategorized";
  }

  const primary = [...suite.actions].sort(
    (left, right) => left.priority - right.priority
  )[0];

  return primary.category;
}

export function resolveCategory(enriched: EnrichedLink): LinkCategory {
  const fromRouting = enriched.routing
    ? resolveCategoryFromRouting(enriched.routing)
    : null;

  if (fromRouting) {
    return fromRouting;
  }

  const mapped = SOURCE_TYPE_CATEGORY[enriched.source_type];

  if (mapped === "portal") {
    return resolvePortalCategory(enriched);
  }

  if (mapped !== "domain") {
    return mapped;
  }

  return resolveFromDomain(enriched.domain, enriched.url);
}
