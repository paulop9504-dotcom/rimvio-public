import { jaccardSimilarity } from "@/lib/commerce/text-similarity";
import type { LinkActionItem } from "@/types/database";

const OPEN_WITH_TITLE =
  /^[\s\S]*?(?:열기|open)$/i;

function readActionCopyText(action: LinkActionItem) {
  const value = action.payload?.copyText;
  return typeof value === "string" ? value.trim() : null;
}

/**
 * Drop open actions whose embedded copy text clearly belongs to another listing.
 */
export function dropMismatchedOpenActions(
  actions: LinkActionItem[],
  linkTitle: string | null | undefined
) {
  const safeTitle = linkTitle?.trim();
  if (!safeTitle) {
    return actions;
  }

  return actions.filter((action) => {
    const copyText = readActionCopyText(action);
    if (!copyText || copyText === safeTitle) {
      return true;
    }

    if (!OPEN_WITH_TITLE.test(action.label.trim())) {
      return true;
    }

    return jaccardSimilarity(copyText, safeTitle) >= 0.2;
  });
}
