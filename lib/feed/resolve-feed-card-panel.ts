import { FEED_MAX_SECONDARY } from "@/lib/feed/feed-panel-limits";
import { shouldShowStudyReceipt } from "@/lib/study/build-study-receipt";
import { isGarbledCaptureOcr } from "@/lib/capture/is-garbled-capture-ocr";
import { getFeedCategoryLabel } from "@/lib/feed/feed-display";
import { resolveActionHint } from "@/lib/feed/action-hint";
import { getDisplayTitleForLink } from "@/lib/feed/sanitize-link-title";
import { isScreenshotLink } from "@/lib/share/ingest-screenshot";
import { isOpenOriginalAction } from "@/lib/feed/feed-display";
import type { LinkActionItem, LinkRow } from "@/types/database";

const SCREENSHOT_SIGNAL: Record<string, string> = {
  travel: "📍",
  food: "🍜",
  shopping: "🛍",
  health: "💊",
  social: "👤",
};

export function resolveFeedCardSignal(
  link: LinkRow,
  focused: LinkActionItem
): string | null {
  const title = getDisplayTitleForLink(link);
  const hint = resolveActionHint(focused, link);

  if (isScreenshotLink(link)) {
    const emoji = SCREENSHOT_SIGNAL[link.category ?? ""] ?? "📷";
    if (title && !isGarbledCaptureOcr(title)) {
      return `${emoji} ${title}`;
    }
    const category = getFeedCategoryLabel(link.category);
    return category ? `${emoji} ${category}` : `${emoji} 사진에서 찾은 맥락`;
  }

  if (hint) {
    return hint;
  }

  return title;
}

export function resolveFeedCardSecondaries(
  actions: LinkActionItem[],
  focused: LinkActionItem,
  limit = FEED_MAX_SECONDARY
) {
  return actions
    .filter((action) => action.id !== focused.id)
    .filter((action) => !isOpenOriginalAction(action.label))
    .slice(0, limit);
}

export type FeedCardInsightKind = "study" | "time" | "truecost" | "market" | null;

export function resolveFeedCardInsight(link: LinkRow): FeedCardInsightKind {
  if (shouldShowStudyReceipt(link)) {
    return "study";
  }

  if (link.domain.includes("youtube") || link.category === "research") {
    return "time";
  }

  if (link.category === "shopping" || link.source_type === "commerce") {
    return "market";
  }

  return null;
}
