import { resolveNavigationPlaceName } from "@/lib/action-chat/resolve-navigation-place";

export type EntityFacetKind = "price" | "hours" | "reserve";

const FACET_SUFFIX: Array<{ facet: EntityFacetKind; re: RegExp }> = [
  { facet: "price", re: /가격$/u },
  { facet: "hours", re: /(?:영업\s*시간|영업시간)$/u },
  { facet: "reserve", re: /예약$/u },
];

const SKIP_FACET =
  /(?:맛집|추천|찾아|검색|길찾|네비|지도|근처|어디)/u;

/** Brand + single intent chip follow-up (e.g. "쿠우쿠우 가격"). */
export function parseEntityFacetIntent(message: string): {
  entity: string;
  facet: EntityFacetKind;
} | null {
  const trimmed = message.trim();
  if (!trimmed || trimmed.length > 48 || SKIP_FACET.test(trimmed)) {
    return null;
  }

  for (const { facet, re } of FACET_SUFFIX) {
    if (!re.test(trimmed)) {
      continue;
    }
    const entityPart = trimmed.replace(re, "").replace(/\s+/g, " ").trim();
    const entity = resolveNavigationPlaceName(entityPart);
    if (!entity || entityPart.length < 2) {
      return null;
    }
    return { entity, facet };
  }

  return null;
}

export function isEntityFacetMessage(message: string): boolean {
  return parseEntityFacetIntent(message) !== null;
}
