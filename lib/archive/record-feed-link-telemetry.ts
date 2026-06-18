import {
  appendActionTelemetry,
  listActionTelemetryForEvent,
} from "@/lib/archive/action-telemetry-store";
import { syncLearningRollupFromTelemetry } from "@/lib/archive/sync-learning-rollup-from-telemetry";
import type { ActionTelemetryKind } from "@/lib/archive/types";
import type { LinkActionItem, LinkRow } from "@/types/database";

export function feedLinkTelemetryEventId(linkId: string): string {
  return `link:${linkId}`;
}

export function recordFeedLinkActionTelemetry(input: {
  link: Pick<LinkRow, "id">;
  action: Pick<LinkActionItem, "id" | "label">;
  kind: ActionTelemetryKind;
  contextKey: string;
  tier?: "MAIN" | "AUX";
  surface?: string;
  at?: string;
}) {
  appendActionTelemetry({
    eventId: feedLinkTelemetryEventId(input.link.id),
    actionId: input.action.id,
    label: input.action.label,
    tier: input.tier ?? "MAIN",
    kind: input.kind,
    surface: input.surface ?? "feed",
    phase: input.contextKey,
    at: input.at,
  });
}

/** Fold feed link telemetry → learning rollup (no EventCandidate archive UI). */
export function foldFeedLinkLearning(input: {
  linkId: string;
  contextKey: string;
}): void {
  syncLearningRollupFromTelemetry({
    telemetryEventId: feedLinkTelemetryEventId(input.linkId),
    contextKey: input.contextKey,
  });
}
