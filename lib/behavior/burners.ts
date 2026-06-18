import {
  normalizeLinkCategory,
  type LinkCategory,
} from "@/lib/categories/types";
import { describeChronoBand } from "@/lib/actions/chrono-suite-actions";
import { copy as defaultCopy } from "@/lib/copy/human-ko";
import type { Copy } from "@/lib/i18n/types";
import type { LinkRow } from "@/types/database";

export type LifeBurner = "work" | "health" | "friends" | "growth";

export const LIFE_BURNERS: LifeBurner[] = ["work", "health", "friends", "growth"];

export const BURNER_LABELS: Record<LifeBurner, string> = {
  work: defaultCopy.burner.work,
  health: defaultCopy.burner.health,
  friends: defaultCopy.burner.friends,
  growth: defaultCopy.burner.growth,
};

export function burnerLabelsFromCopy(copy: Copy): Record<LifeBurner, string> {
  return {
    work: copy.burner.work,
    health: copy.burner.health,
    friends: copy.burner.friends,
    growth: copy.burner.growth,
  };
}

export const BURNER_EMOJI: Record<LifeBurner, string> = {
  work: "💼",
  health: "💪",
  friends: "🤝",
  growth: "📚",
};

const CATEGORY_BURNER: Record<LinkCategory, LifeBurner> = {
  shopping: "work",
  travel: "friends",
  media: "growth",
  research: "work",
  social: "friends",
  uncategorized: "growth",
};

const TEXT_BURNER_RULES: Array<{ burner: LifeBurner; pattern: RegExp }> = [
  {
    burner: "health",
    pattern:
      /workout|운동|헬스|yoga|필라테스|diet|식단|영양|recipe|baemin|coupang\.com\/eats|배달|fitness|health/i,
  },
  {
    burner: "friends",
    pattern:
      /meetup|모임|카톡|kakao|party|wedding|행사|미팅|network|친구|family|airbnb|여행/i,
  },
  {
    burner: "growth",
    pattern:
      /course|lecture|pdf|study|학습|강의|youtube|netflix|tving|design|figma|behance|news|뉴스|wiki/i,
  },
  {
    burner: "work",
    pattern:
      /coupang|shopping|finance|stock|주식|wanted|채용|github|ticket|업무|회의|calendar|google\.com\/maps/i,
  },
];

export function resolveBurnerFromLink(link: {
  original_url: string;
  title?: string | null;
  domain?: string | null;
  category?: string | null;
}): LifeBurner {
  const haystack = [
    link.original_url,
    link.domain ?? "",
    link.title ?? "",
  ].join(" ");

  for (const rule of TEXT_BURNER_RULES) {
    if (rule.pattern.test(haystack)) {
      return rule.burner;
    }
  }

  return CATEGORY_BURNER[normalizeLinkCategory(link.category)];
}

export type BurnerWeights = Record<LifeBurner, number>;

export function aggregateBurnerWeights(
  links: Array<{
    original_url: string;
    title?: string | null;
    domain?: string | null;
    category?: string | null;
    link_status?: string | null;
  }>,
  options?: { maxLinks?: number; onlyOpen?: boolean }
): BurnerWeights {
  const maxLinks = options?.maxLinks ?? 40;
  const onlyOpen = options?.onlyOpen ?? true;

  const recent = links
    .filter((link) => !onlyOpen || link.link_status !== "done")
    .slice(0, maxLinks);

  const totals = Object.fromEntries(
    LIFE_BURNERS.map((burner) => [burner, 0])
  ) as BurnerWeights;

  for (const link of recent) {
    totals[resolveBurnerFromLink(link)] += 1;
  }

  const grandTotal = Object.values(totals).reduce((sum, value) => sum + value, 0);

  if (grandTotal === 0) {
    return totals;
  }

  for (const burner of LIFE_BURNERS) {
    totals[burner] = totals[burner] / grandTotal;
  }

  return totals;
}

export function describeBurnerCoaching(
  weights: BurnerWeights,
  openCount: number,
  hour = new Date().getHours(),
  copy: Copy = defaultCopy
): string | null {
  if (openCount <= 0) {
    return null;
  }

  const labels = burnerLabelsFromCopy(copy);
  const entries = LIFE_BURNERS.map((burner) => ({
    burner,
    weight: weights[burner] ?? 0,
  })).sort((left, right) => right.weight - left.weight);

  const top = entries[0];
  const second = entries[1];

  if (!top || top.weight < 0.34) {
    if (openCount >= 5) {
      return copy.coaching.openMany(openCount);
    }

    return null;
  }

  const pct = Math.round(top.weight * 100);
  const chrono = describeChronoBand(hour);

  if (top.burner === "work" && pct >= 45) {
    if (hour >= 18) {
      return copy.coaching.workEvening(pct, labels.growth);
    }

    return copy.coaching.workDay(pct);
  }

  if (top.burner === "growth" && hour >= 18 && hour < 22) {
    return copy.coaching.growthEvening(labels.growth);
  }

  if (second && top.weight - second.weight < 0.12) {
    return copy.coaching.balanced(
      labels[top.burner],
      labels[second.burner],
      chrono.need
    );
  }

  return copy.coaching.dominant(labels[top.burner], pct, chrono.psyche);
}

export function countOpenLinks(links: LinkRow[]) {
  return links.filter((link) => link.link_status !== "done").length;
}
