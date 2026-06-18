import type { EnricherContext } from "@/lib/enrichers/types";
import { scoreLinkActionWithFactors } from "@/lib/enrichers/score-link-action";
import type { LinkActionItem } from "@/types/database";

export function rankActionsByContext(
  actions: LinkActionItem[],
  context: EnricherContext,
  sourceUrl: string,
  rankingContextKey?: string,
) {
  return [...actions].sort((left, right) => {
    const scoreDelta =
      scoreLinkActionWithFactors(right, context, sourceUrl, rankingContextKey)
        .score -
      scoreLinkActionWithFactors(left, context, sourceUrl, rankingContextKey)
        .score;

    if (scoreDelta !== 0) {
      return scoreDelta;
    }

    return 0;
  });
}

export { isPlaceRelatedUrl } from "@/lib/resolvers";
