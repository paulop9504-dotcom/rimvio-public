import {
  buildProgressiveSummary,
  estimateLinkActionConfidence,
  resolveDisclosureTier,
  type ActionDisclosureTier,
} from "@/lib/action-chat/action-confidence";
import { resolveActionOfferUx, type ActionOfferUx } from "@/lib/action-chat/trust-disclosure";
import { buildSurfaceLinkRankingContextKey } from "@/lib/archive/record-surface-link-telemetry";
import { rankFeedLinkActionsForDock } from "@/lib/feed/rank-feed-link-actions";
import type { LinkActionItem, LinkRow } from "@/types/database";

export type LinkMainOfferSurface = "now" | "stack" | "feed";

export type ResolvedLinkMainOffer = {
  primary: LinkActionItem | null;
  secondary: LinkActionItem[];
  confidence: number;
  tier: ActionDisclosureTier;
  ux: ActionOfferUx;
  rankingContextKey: string;
  /** Travel D-0/D-1 — skip confirm gate. */
  urgencyBypass: boolean;
  promptSummary: string | null;
};

function resolveTravelUrgencyBypass(link: Pick<LinkRow, "category" | "title" | "original_url">): boolean {
  if (link.category !== "travel") {
    return false;
  }
  const hay = `${link.title} ${link.original_url}`.toLowerCase();
  return /d-?[01]\b|오늘\s*출발|내일\s*출발|today|tomorrow|urgent/iu.test(hay);
}

function resolvePrimaryAction(link: LinkRow): LinkActionItem | null {
  if (link.actions.length === 0) {
    return null;
  }
  const ranked = rankFeedLinkActionsForDock({
    actions: link.actions,
    link,
  });
  return ranked[0]?.action ?? link.actions[0] ?? null;
}

/** Rollup-aware MAIN pick + confidence/trust gate for /now, /stack, feed. */
export function resolveLinkMainOffer(input: {
  link: LinkRow;
  surface: LinkMainOfferSurface;
  locateLoading?: boolean;
  hasLocateResult?: boolean;
  actionsRevealed?: boolean;
}): ResolvedLinkMainOffer {
  const primary = resolvePrimaryAction(input.link);
  const rankedIds = new Set(
    rankFeedLinkActionsForDock({ actions: input.link.actions, link: input.link }).map(
      (row) => row.action.id,
    ),
  );
  const secondary = input.link.actions
    .filter((action) => action.id !== primary?.id && rankedIds.has(action.id))
    .slice(0, 3);

  const urgencyBypass = resolveTravelUrgencyBypass(input.link);
  let confidence = estimateLinkActionConfidence({
    link: input.link,
    locateLoading: input.locateLoading,
    hasLocateResult: input.hasLocateResult,
    primary,
  });

  if (urgencyBypass) {
    confidence = Math.max(confidence, 0.94);
  }

  const tier = resolveDisclosureTier(confidence);
  const ux = resolveActionOfferUx({
    confidence,
    hasActions: Boolean(primary),
    actionsRevealed: urgencyBypass ? true : (input.actionsRevealed ?? false),
  });

  const displayTitle = input.link.title.trim() || input.link.domain;
  let promptSummary: string | null = null;
  if (tier === "medium" && primary) {
    promptSummary = buildProgressiveSummary({
      title: displayTitle,
      tier: "medium",
      primaryLabel: primary.label,
    });
  } else if (tier === "low") {
    promptSummary = "어떤 도움이 필요하신지 조금 더 알려주실까요?";
  }

  return {
    primary,
    secondary,
    confidence,
    tier,
    ux,
    rankingContextKey: buildSurfaceLinkRankingContextKey(input.link),
    urgencyBypass,
    promptSummary,
  };
}

export function shouldShowLinkMainHero(input: {
  offer: ResolvedLinkMainOffer;
  actionsRevealed: boolean;
}): boolean {
  if (!input.offer.primary) {
    return false;
  }
  if (input.offer.tier === "low" || input.offer.tier === "none") {
    return false;
  }
  if (input.offer.urgencyBypass) {
    return true;
  }
  if (input.offer.tier === "high") {
    return input.actionsRevealed || input.offer.ux.stage >= 2;
  }
  return input.actionsRevealed;
}
