import type { ExperienceIntent } from "@/lib/experience-intent/experience-intent-types";

export const FEED_RECIPE_SLOT_KINDS = [
  "people",
  "memory",
  "mobility",
  "prep",
  "stay",
  "place",
  "schedule",
  "documents",
] as const;

export type FeedRecipeSlotKind = (typeof FEED_RECIPE_SLOT_KINDS)[number];

export type FeedRecipe = {
  intent: ExperienceIntent;
  slots: readonly [
    FeedRecipeSlotKind,
    FeedRecipeSlotKind,
    FeedRecipeSlotKind,
    FeedRecipeSlotKind,
  ];
  recallMode: "globe" | "shorts" | "minimal";
};

export const FEED_RECIPE_SLOT_LABELS: Record<FeedRecipeSlotKind, string> = {
  people: "참석자",
  memory: "추억",
  mobility: "이동",
  prep: "준비",
  stay: "숙소",
  place: "장소",
  schedule: "일정",
  documents: "문서",
};

export const FEED_RECIPE_SLOT_EMOJI: Record<FeedRecipeSlotKind, string> = {
  people: "👥",
  memory: "🧠",
  mobility: "🚗",
  prep: "🧳",
  stay: "🏨",
  place: "📍",
  schedule: "🗓",
  documents: "📎",
};

/** Intent → four-slot Feed card recipe (SSOT). */
export const FEED_RECIPE_REGISTRY: Record<
  Exclude<ExperienceIntent, "other">,
  FeedRecipe
> = {
  wedding: {
    intent: "wedding",
    slots: ["people", "memory", "mobility", "prep"],
    recallMode: "globe",
  },
  travel: {
    intent: "travel",
    slots: ["mobility", "stay", "place", "memory"],
    recallMode: "globe",
  },
  business: {
    intent: "business",
    slots: ["schedule", "documents", "mobility", "stay"],
    recallMode: "minimal",
  },
  meeting: {
    intent: "meeting",
    slots: ["people", "schedule", "mobility", "prep"],
    recallMode: "minimal",
  },
  birthday: {
    intent: "birthday",
    slots: ["people", "memory", "place", "prep"],
    recallMode: "shorts",
  },
  hospital: {
    intent: "hospital",
    slots: ["schedule", "place", "documents", "mobility"],
    recallMode: "minimal",
  },
  school: {
    intent: "school",
    slots: ["schedule", "place", "documents", "mobility"],
    recallMode: "minimal",
  },
  sports: {
    intent: "sports",
    slots: ["mobility", "place", "memory", "prep"],
    recallMode: "globe",
  },
  family: {
    intent: "family",
    slots: ["people", "memory", "place", "prep"],
    recallMode: "shorts",
  },
  date: {
    intent: "date",
    slots: ["people", "place", "memory", "mobility"],
    recallMode: "shorts",
  },
  food: {
    intent: "food",
    slots: ["place", "schedule", "people", "memory"],
    recallMode: "minimal",
  },
  concert: {
    intent: "concert",
    slots: ["schedule", "place", "memory", "mobility"],
    recallMode: "shorts",
  },
  funeral: {
    intent: "funeral",
    slots: ["people", "schedule", "place", "mobility"],
    recallMode: "minimal",
  },
};

/** Minimum intent confidence before recipe layout replaces generic card body. */
export const FEED_RECIPE_MIN_CONFIDENCE = 40;

export function feedRecipeForIntent(
  intent: ExperienceIntent,
): FeedRecipe | null {
  if (intent === "other") {
    return null;
  }
  return FEED_RECIPE_REGISTRY[intent] ?? null;
}
