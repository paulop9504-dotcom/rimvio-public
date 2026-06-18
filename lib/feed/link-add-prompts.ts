import type { FeedCategoryFilter } from "@/lib/categories/types";

export type LinkAddPromptKind =
  | "single_link"
  | "low_inventory"
  | "reached_end";

export function resolveLinkAddPrompt(input: {
  activeCount: number;
  filter: FeedCategoryFilter;
  visibleCount: number;
  activeIndex: number;
}): LinkAddPromptKind | null {
  const { activeCount, visibleCount, activeIndex } = input;

  if (visibleCount === 0) {
    return null;
  }

  if (activeCount === 1) {
    return "single_link";
  }

  if (activeCount >= 2 && activeCount <= 3) {
    return "low_inventory";
  }

  if (
    activeCount <= 5 &&
    visibleCount > 0 &&
    activeIndex >= visibleCount - 1
  ) {
    return "reached_end";
  }

  return null;
}
