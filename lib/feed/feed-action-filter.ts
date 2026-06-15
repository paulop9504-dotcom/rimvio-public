import type { LinkActionItem } from "@/types/database";

/** Copy-only chips are rarely useful as feed CTAs. */
export function isCopyOnlyFeedAction(action: LinkActionItem) {
  if (action.kind === "copy") {
    return true;
  }

  return /(?:^|\s)복사$/.test(action.label.replace(/\s+/g, " ").trim());
}

export function filterFeedDisplayActions(actions: LinkActionItem[]) {
  const filtered = actions.filter((action) => !isCopyOnlyFeedAction(action));
  return filtered.length > 0 ? filtered : actions;
}
