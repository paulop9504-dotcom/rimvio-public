import type { ChatTurn, SelfLearningReport } from "@/lib/self-learning/types";
import {
  buildInteractionRecords,
  readHitRunFeedbackEntries,
} from "@/lib/self-learning/read-interaction-log";
import { proposeSystemUpdates } from "@/lib/self-learning/propose-system-update";
import {
  mergeConflictingProposals,
  runFullRegressionGate,
  runRegressionGate,
  SUCCESS_THRESHOLD,
} from "@/lib/self-learning/anti-drift-gate";
import type { FailureKind } from "@/lib/self-learning/types";

export type SelfLearningLoopInput = {
  /** Run playbook regression sample before accepting proposals. */
  runRegression?: boolean;
  regressionThreshold?: number;
  failureThreshold?: number;
  historyByMessageId?: Record<string, ChatTurn[]>;
};

/**
 * Closed loop: collect → classify → propose → gate.
 * Does NOT mutate prompts/rules — proposals are review-only.
 */
export async function runSelfLearningLoop(
  input: SelfLearningLoopInput = {}
): Promise<SelfLearningReport> {
  const entries = readHitRunFeedbackEntries();
  const records = buildInteractionRecords({
    feedbackEntries: entries,
    historyByMessageId: input.historyByMessageId,
  });

  const failures = records.filter((record) => record.isFailure);
  const byFailureKind: Record<FailureKind, number> = {
    routing_error: 0,
    execution_error: 0,
    ux_mismatch: 0,
    unknown: 0,
  };
  const byIntentKey: Record<string, number> = {};

  for (const record of failures) {
    byFailureKind[record.failureKind] += 1;
    const key =
      record.routing?.routing_patch ??
      record.routing?.ai_intent ??
      record.routing?.chat_axis_route ??
      "unknown";
    byIntentKey[key] = (byIntentKey[key] ?? 0) + 1;
  }

  const rawProposals = proposeSystemUpdates(
    records,
    input.failureThreshold ?? 3
  );
  const proposals = mergeConflictingProposals(rawProposals);

  let regression: SelfLearningReport["regression"];
  let accepted = proposals.length === 0;

  if (input.runRegression) {
    regression = await runFullRegressionGate({
      threshold: input.regressionThreshold ?? SUCCESS_THRESHOLD,
    });
    accepted = regression.accepted;
  } else if (proposals.length === 0) {
    accepted = true;
  } else {
    accepted = false;
  }

  return {
    analyzedAt: new Date().toISOString(),
    interactionCount: records.length,
    failureCount: failures.length,
    failureRate:
      records.length === 0 ? 0 : failures.length / records.length,
    byFailureKind,
    byIntentKey,
    proposals,
    regression,
    accepted,
  };
}

export {
  detectImplicitSignals,
  implicitSignalsImplyFailure,
} from "@/lib/self-learning/implicit-signals";
export { classifyFailure } from "@/lib/self-learning/failure-classifier";
export { observeLiveTurn, buildInteractionRecords } from "@/lib/self-learning/read-interaction-log";
export { proposeSystemUpdates, shouldAutoImproveIntent } from "@/lib/self-learning/propose-system-update";
export { runRegressionGate, runFullRegressionGate, SUCCESS_THRESHOLD } from "@/lib/self-learning/anti-drift-gate";
export { runSelfLearningGate, assertSelfLearningGate } from "@/lib/self-learning/gate-runner";
export { runNightlyQA, scoreUnifiedStress } from "@/lib/self-learning/nightly-runner";
export { appendLiveTurn, getLiveTurnLogPath } from "@/lib/self-learning/append-live-turn";
export { observeAndLogLiveTurn } from "@/lib/self-learning/observe-and-log-turn";
export { submitLiveTurn } from "@/lib/self-learning/submit-live-turn-client";
export type { LiveTurnLogEntry, LiveTurnStage } from "@/lib/self-learning/live-turn-types";
