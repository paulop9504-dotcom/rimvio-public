import { pickFoggPrimaryAction } from "@/lib/behavior/fogg";
import { normalizeEnricherContext } from "@/lib/enrichers/context";
import {
  formatLinkActionWhyLine,
  scoreLinkActionWithFactors,
} from "@/lib/enrichers/score-link-action";
import { filterFeedDisplayActions } from "@/lib/feed/feed-action-filter";
import { buildLinkRankingContextKey } from "@/lib/feed/build-link-ranking-context-key";
import type { LinkActionItem, LinkRow } from "@/types/database";

export type RankedFeedLinkAction = {
  action: LinkActionItem;
  score: number;
  whyLine: string;
};

export function rankFeedLinkActionsForDock(input: {
  actions: readonly LinkActionItem[];
  link: Pick<LinkRow, "domain" | "category" | "original_url">;
  hour?: number;
}): RankedFeedLinkAction[] {
  const display = filterFeedDisplayActions([...input.actions]);
  if (display.length === 0) {
    return [];
  }

  const context = normalizeEnricherContext({
    hour: input.hour ?? new Date().getHours(),
  });
  const rankingContextKey = buildLinkRankingContextKey({
    domain: input.link.domain,
    category: input.link.category,
  });

  const ranked = display
    .map((action) => {
      const { score, factors } = scoreLinkActionWithFactors(
        action,
        context,
        input.link.original_url,
        rankingContextKey,
      );
      return {
        action,
        score,
        whyLine: formatLinkActionWhyLine({
          primaryLabel: action.label,
          factors,
        }),
      };
    })
    .sort((left, right) => right.score - left.score);

  const foggPrimary = pickFoggPrimaryAction(display);
  if (foggPrimary && ranked[0]?.action.id !== foggPrimary.id) {
    const foggEntry = ranked.find((entry) => entry.action.id === foggPrimary.id);
    if (foggEntry && foggEntry.score >= ranked[0]!.score - 30) {
      return [foggEntry, ...ranked.filter((entry) => entry.action.id !== foggEntry.action.id)];
    }
  }

  return ranked;
}

export function buildFeedPrimaryRankingWhy(input: {
  actions: readonly LinkActionItem[];
  primary: LinkActionItem;
  link: Pick<LinkRow, "domain" | "category" | "original_url">;
}): string {
  const ranked = rankFeedLinkActionsForDock({
    actions: input.actions,
    link: input.link,
  });
  return (
    ranked.find((entry) => entry.action.id === input.primary.id)?.whyLine ??
    formatLinkActionWhyLine({
      primaryLabel: input.primary.label,
      factors: scoreLinkActionWithFactors(
        input.primary,
        normalizeEnricherContext({ hour: new Date().getHours() }),
        input.link.original_url,
        buildLinkRankingContextKey({
          domain: input.link.domain,
          category: input.link.category,
        }),
      ).factors,
    })
  );
}
