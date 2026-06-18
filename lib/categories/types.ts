/** Normalized link categories for Inbox filter + persist. */
export const LINK_CATEGORIES = [
  "shopping",
  "travel",
  "media",
  "research",
  "social",
  "uncategorized",
] as const;

export type LinkCategory = (typeof LINK_CATEGORIES)[number];

export const LINK_CATEGORY_LABELS: Record<LinkCategory, string> = {
  shopping: "쇼핑",
  travel: "여행",
  media: "미디어",
  research: "리서치",
  social: "소셜",
  uncategorized: "기타",
};

export function isLinkCategory(value: string): value is LinkCategory {
  return (LINK_CATEGORIES as readonly string[]).includes(value);
}

/** Map legacy demo/enricher labels → normalized category. */
export function normalizeLinkCategory(
  value: string | null | undefined
): LinkCategory {
  if (!value) {
    return "uncategorized";
  }

  if (isLinkCategory(value)) {
    return value;
  }

  const legacy: Record<string, LinkCategory> = {
    shared: "uncategorized",
    video: "media",
    commerce: "shopping",
    chat: "social",
    dev: "research",
    place: "travel",
    design: "research",
    product: "research",
    engineering: "research",
    planning: "research",
    travel: "travel",
    inbox: "uncategorized",
  };

  return legacy[value.trim().toLowerCase()] ?? "uncategorized";
}

export type InboxFilterValue = "all" | LinkCategory;

/** Feed top chips — primary scope filter. */
export type FeedCategoryFilter = "all";

export const FEED_CATEGORY_PILLS: Array<{
  value: FeedCategoryFilter;
  label: string;
  emoji?: string;
}> = [{ value: "all", label: "전체" }];

export const CATEGORY_PILLS: Array<{
  value: InboxFilterValue;
  label: string;
  emoji?: string;
}> = [
  { value: "all", label: "All" },
  { value: "shopping", label: LINK_CATEGORY_LABELS.shopping, emoji: "🛒" },
  { value: "travel", label: LINK_CATEGORY_LABELS.travel, emoji: "✈️" },
  { value: "media", label: LINK_CATEGORY_LABELS.media, emoji: "🎬" },
  { value: "research", label: LINK_CATEGORY_LABELS.research, emoji: "🔍" },
  { value: "social", label: LINK_CATEGORY_LABELS.social, emoji: "💬" },
  { value: "uncategorized", label: LINK_CATEGORY_LABELS.uncategorized, emoji: "👀" },
];
