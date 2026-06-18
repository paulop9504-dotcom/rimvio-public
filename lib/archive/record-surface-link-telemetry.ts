import {
  feedLinkTelemetryEventId,
  recordFeedLinkActionTelemetry,
} from "@/lib/archive/record-feed-link-telemetry";
import { syncLearningRollupFromTelemetry } from "@/lib/archive/sync-learning-rollup-from-telemetry";
import type { ActionTelemetryKind } from "@/lib/archive/types";
import { buildCommerceAwareRankingContextKey } from "@/lib/feed/build-commerce-aware-ranking-context-key";
import { buildLinkRankingContextKey } from "@/lib/feed/build-link-ranking-context-key";
import type { LinkActionItem, LinkRow } from "@/types/database";

export type SurfaceLinkTelemetrySurface = "feed" | "now" | "stack" | "globe_hub";

export function buildSurfaceLinkRankingContextKey(
  link: Pick<LinkRow, "domain" | "category" | "source_type">,
  action?: Pick<LinkActionItem, "id" | "label" | "payload"> | null,
): string {
  if (action) {
    return buildCommerceAwareRankingContextKey({ link, action });
  }
  return buildLinkRankingContextKey({
    domain: link.domain,
    category: link.category,
  });
}

export function recordSurfaceLinkActionTelemetry(input: {
  link: Pick<LinkRow, "id" | "domain" | "category" | "source_type">;
  action: Pick<LinkActionItem, "id" | "label" | "payload">;
  kind: ActionTelemetryKind;
  surface: SurfaceLinkTelemetrySurface;
  tier?: "MAIN" | "AUX";
  at?: string;
}) {
  const contextKey = buildSurfaceLinkRankingContextKey(input.link, input.action);
  recordFeedLinkActionTelemetry({
    link: input.link,
    action: input.action,
    kind: input.kind,
    contextKey,
    tier: input.tier ?? "MAIN",
    surface: input.surface,
    at: input.at,
  });
}

export function foldSurfaceLinkLearning(input: {
  linkId: string;
  link: Pick<LinkRow, "domain" | "category" | "source_type">;
  action?: Pick<LinkActionItem, "id" | "label" | "payload"> | null;
}): void {
  syncLearningRollupFromTelemetry({
    telemetryEventId: feedLinkTelemetryEventId(input.linkId),
    contextKey: buildSurfaceLinkRankingContextKey(input.link, input.action),
  });
}
