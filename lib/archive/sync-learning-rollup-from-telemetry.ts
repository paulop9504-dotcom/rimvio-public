import { listActionTelemetryForEvent } from "@/lib/archive/action-telemetry-store";
import { applyLearningSignalsAbsolute } from "@/lib/archive/learning-rollup-store";
import type { LearningSignal } from "@/lib/archive/types";

function aggregateTelemetryByAction(telemetryEventId: string) {
  const telemetry = listActionTelemetryForEvent(telemetryEventId);
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

  return byAction;
}

function toLearningSignals(
  contextKey: string,
  byAction: Map<
    string,
    { label: string; shown: number; clicked: number; executed: number; dismissed: number }
  >,
): LearningSignal[] {
  return [...byAction.entries()].map(([actionKey, stats]) => ({
    contextKey,
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
  }));
}

/** Idempotent fold — replaces rollup counts from full telemetry aggregate. */
export function syncLearningRollupFromTelemetry(input: {
  telemetryEventId: string;
  contextKey: string;
}): void {
  const byAction = aggregateTelemetryByAction(input.telemetryEventId);
  if (byAction.size === 0) {
    return;
  }
  applyLearningSignalsAbsolute(
    toLearningSignals(input.contextKey, byAction),
  );
}
