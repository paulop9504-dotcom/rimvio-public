import {
  appendActionTelemetry,
  listActionTelemetryForEvent,
} from "@/lib/archive/action-telemetry-store";
import { applyLearningSignals } from "@/lib/archive/learning-rollup-store";
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
  at?: string;
}) {
  appendActionTelemetry({
    eventId: feedLinkTelemetryEventId(input.link.id),
    actionId: input.action.id,
    label: input.action.label,
    tier: input.tier ?? "MAIN",
    kind: input.kind,
    surface: "feed",
    phase: input.contextKey,
    at: input.at,
  });
}

/** Fold feed link telemetry → learning rollup (no EventCandidate archive UI). */
export function foldFeedLinkLearning(input: {
  linkId: string;
  contextKey: string;
}): void {
  const telemetry = listActionTelemetryForEvent(feedLinkTelemetryEventId(input.linkId));
  if (telemetry.length === 0) {
    return;
  }

  const byAction = new Map<
    string,
    { label: string; shown: number; clicked: number; executed: number; dismissed: number }
  >();

  for (const entry of telemetry) {
    const bucket = byAction.get(entry.actionId) ?? {
      label: entry.label,
      shown: 0,
      clicked: 0,
      executed: 0,
      dismissed: 0,
    };
    if (entry.kind === "shown") {
      bucket.shown += 1;
    }
    if (entry.kind === "clicked") {
      bucket.clicked += 1;
    }
    if (entry.kind === "executed") {
      bucket.executed += 1;
    }
    if (entry.kind === "dismissed") {
      bucket.dismissed += 1;
    }
    byAction.set(entry.actionId, bucket);
  }

  applyLearningSignals(
    [...byAction.entries()].map(([actionKey, stats]) => ({
      contextKey: input.contextKey,
      actionKey,
      label: stats.label,
      shown: stats.shown,
      clicked: stats.clicked,
      executed: stats.executed,
      dismissed: stats.dismissed,
      rates: {
        clickRate: stats.shown > 0 ? stats.clicked / stats.shown : 0,
        executeRate: stats.shown > 0 ? stats.executed / stats.shown : 0,
        dismissRate: stats.shown > 0 ? stats.dismissed / stats.shown : 0,
      },
      scoreDelta: 0,
    })),
  );
}
