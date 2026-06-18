import type { CapabilityId } from "@/lib/capability-registry/capability-types";
import type { LearningObservation } from "@/lib/learning/learning-contract";

const BASE_TS = "2026-06-04T12:00:00.000Z";

export function fixtureObservation(
  partial: Partial<LearningObservation> & Pick<LearningObservation, "capabilityId">,
): LearningObservation {
  return {
    observationId: partial.observationId ?? "obs-fixture-1",
    executionId: partial.executionId,
    capabilityId: partial.capabilityId,
    surfaceId: partial.surfaceId ?? "surface:ec:ec-test-1",
    actionType: partial.actionType ?? "execute",
    resultStatus: partial.resultStatus ?? "success",
    timestamp: partial.timestamp ?? BASE_TS,
    contextSnapshot: {
      channel: "FEED",
      hourBucket: 12,
      ...partial.contextSnapshot,
    },
  };
}

export const FIXTURE_NAVIGATE_SUCCESS: LearningObservation = fixtureObservation({
  observationId: "obs-nav-1",
  capabilityId: "NAVIGATE",
  resultStatus: "success",
});

export const FIXTURE_ALARM_SUCCESS: LearningObservation = fixtureObservation({
  observationId: "obs-alarm-1",
  capabilityId: "ALARM",
  timestamp: "2026-06-04T12:01:00.000Z",
});

export const FIXTURE_IGNORE_NAVIGATE: LearningObservation = fixtureObservation({
  observationId: "obs-ignore-1",
  capabilityId: "NAVIGATE",
  actionType: "ignore",
  resultStatus: "cancel",
});

export function fixtureNavigateReinforcementBatch(count: number): LearningObservation[] {
  const rows: LearningObservation[] = [];
  for (let i = 0; i < count; i += 1) {
    rows.push(
      fixtureObservation({
        observationId: `obs-nav-batch-${i}`,
        capabilityId: "NAVIGATE" as CapabilityId,
        timestamp: `2026-06-04T12:${String(i).padStart(2, "0")}:00.000Z`,
        resultStatus: "success",
      }),
    );
  }
  return rows;
}
