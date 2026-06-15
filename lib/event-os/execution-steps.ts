import type { OrchestratorResult } from "@/lib/action-chat/orchestrator-types";
import { getActionProjectionRevision } from "@/lib/action-projection/action-projection-cache";
import { composeActionProjection } from "@/lib/action-projection/compose-action-projection";
import { projectActionCalendarChips } from "@/lib/action-projection/project-action-calendar";
import { buildActionCalendar } from "@/lib/calendar/build-action-calendar";
import {
  loadPendingEventCandidates,
} from "@/lib/event-kernel/review/pending-event-candidate-store";
import { OCR_REVIEW_DATES_PREFIX } from "@/lib/event-kernel/review/pending-event-candidate-dates";
import { getReviewState } from "@/lib/event-kernel/review/review-state";
import { validatePendingEventCandidates } from "@/lib/event-kernel/review/validate-pending-event-candidate";
import { buildCausalProof, validationProofFromRows } from "@/lib/event-os/build-causal-proof";
import type { CausalProof, CausalProofInput } from "@/lib/event-os/causal-proof-types";
import type { UiDiff } from "@/lib/event-os/causal-trace-types";
import { withReviewExecutionLock } from "@/lib/event-os/review-execution-lock";

export type ReviewStepOutcome = {
  proof: CausalProof;
  orchestrator: OrchestratorResult | null;
};

function stepOutcome(
  proof: CausalProof,
  orchestrator: OrchestratorResult | null = null
): ReviewStepOutcome {
  return { proof, orchestrator };
}

export function runWithOptionalLock<T>(
  scopeId: string,
  runtimeOwned: boolean | undefined,
  fn: () => T
): { ok: true; value: T } | { ok: false; reason: string } {
  if (runtimeOwned) {
    return { ok: true, value: fn() };
  }
  return withReviewExecutionLock(scopeId, fn);
}
import { snapshotEventOsState } from "@/lib/event-os/snapshot-event-os-state";
import { orchestrateEventReviewApproval } from "@/lib/events/orchestrate-event-review-approval";
import { orchestrateEventReviewDateResolution } from "@/lib/events/orchestrate-event-review-date-resolution";
import {
  listEventCalendarRows,
  projectEventCalendarChips,
} from "@/lib/events/project-event-calendar";

function reviewCandidateIds(scopeId: string): string[] {
  return getReviewState(scopeId).candidateIds;
}

function uiDiffFromResult(result: OrchestratorResult | null): UiDiff {
  if (!result) {
    return "none";
  }
  if (result.uiTrigger?.type === "OCR_REVIEW_DATE_PICKER") {
    return "show DATE_PICKER";
  }
  if (result.meta?.execution_route === "EVENT_REVIEW_DATE_CONFIRM") {
    return "show CONFIRM_SCREEN";
  }
  if (result.meta?.execution_route === "CALENDAR_COMMIT") {
    return "calendar_update + action_overlay";
  }
  return "none";
}

function overlayCount(now: Date): number {
  const eventChips = projectEventCalendarChips(listEventCalendarRows(), now);
  const actionChips = projectActionCalendarChips(
    composeActionProjection({ now }).entries,
    now
  );
  return buildActionCalendar({
    eventChips,
    projectionActionChips: actionChips,
    streamActions: [],
    knowledgeEntities: [],
    now,
  }).rowCount;
}

/** Dry-run: validation only, no SSOT write. */
export function planApproveCommit(scopeId: string): {
  commitDecision: "BLOCKED" | "EXECUTED";
  validations: ReturnType<typeof validatePendingEventCandidates>;
  validationResult: ReturnType<typeof validationProofFromRows>["result"];
} {
  const candidates = loadPendingEventCandidates(reviewCandidateIds(scopeId), scopeId);
  const validations = validatePendingEventCandidates(candidates);
  const blocked = validations.some((row) => row.blockedBy.length > 0);
  const proof = validationProofFromRows(
    validations,
    blocked ? "MISSING_DATE" : "PASS"
  );
  return {
    commitDecision: blocked ? "BLOCKED" : "EXECUTED",
    validations,
    validationResult: proof.result,
  };
}

export function runApproveStep(input: {
  message?: string;
  scopeId?: string;
  now?: Date;
  dryRun?: boolean;
  runtimeOwned?: boolean;
}): ReviewStepOutcome {
  const scopeId = input.scopeId ?? "default";
  const now = input.now ?? new Date();
  const clockIso = now.toISOString();
  const proofInput: CausalProofInput = {
    action: input.message ?? "맞아",
    step: "approve",
    scopeId,
    clockIso,
  };

  const stateBefore = snapshotEventOsState(scopeId, now);
  const validationsBefore = validatePendingEventCandidates(
    loadPendingEventCandidates(reviewCandidateIds(scopeId), scopeId)
  );

  const locked = runWithOptionalLock(scopeId, input.runtimeOwned, () => {
    if (input.dryRun) {
      return planApproveCommit(scopeId);
    }
    return orchestrateEventReviewApproval({
      message: proofInput.action,
      scopeId,
    });
  });

  if (!locked.ok) {
    return stepOutcome(
      buildCausalProof({
        input: proofInput,
        plan: {
          triggeredFunction: "approveCandidate",
          triggeredChain: ["inferApprovalAction"],
          intendedCommit: "BLOCKED",
        },
        execution: {
          dryRun: Boolean(input.dryRun),
          stepsExecuted: [],
          blockedByLock: true,
          lockReason: locked.reason,
        },
        stateBefore,
        stateAfter: stateBefore,
        validationProof: validationProofFromRows(validationsBefore, "MISSING_DATE"),
        commitDecision: "BLOCKED",
        uiDiff: "none",
        causalChain: ["Execution blocked: review scope locked"],
        extraAnomalies: ["execution_locked"],
      })
    );
  }

  const outcome = locked.value;
  const stateAfter = snapshotEventOsState(scopeId, now);
  const validationsAfter = validatePendingEventCandidates(
    loadPendingEventCandidates(reviewCandidateIds(scopeId), scopeId)
  );

  if (input.dryRun) {
    const plan = outcome as ReturnType<typeof planApproveCommit>;
    return stepOutcome(
      buildCausalProof({
        input: proofInput,
        plan: {
          triggeredFunction: "approveCandidate (dry-run)",
          triggeredChain: ["validatePendingEventCandidates"],
          intendedCommit: plan.commitDecision,
        },
        execution: {
          dryRun: true,
          stepsExecuted: ["validatePendingEventCandidates"],
        },
        stateBefore,
        stateAfter: stateBefore,
        validationProof: validationProofFromRows(
          plan.validations,
          plan.validationResult
        ),
        commitDecision: plan.commitDecision,
        uiDiff: plan.commitDecision === "BLOCKED" ? "show DATE_PICKER" : "none",
        causalChain: [
          "Dry-run approve",
          plan.commitDecision === "BLOCKED"
            ? "Would block: MISSING_DATE"
            : "Would execute commit",
        ],
      })
    );
  }

  const result = outcome as OrchestratorResult | null;
  const blocked = result?.meta?.execution_route === "EVENT_REVIEW_DATE_PICKER";

  return stepOutcome(
    buildCausalProof({
    input: proofInput,
    plan: {
      triggeredFunction: "approveCandidate → orchestrateEventReviewApproval",
      triggeredChain: [
        "inferApprovalAction",
        "executeApprovePendingEvents",
        "validatePendingEventCandidate",
      ],
      intendedCommit: blocked ? "BLOCKED" : "EXECUTED",
    },
    execution: {
      dryRun: false,
      stepsExecuted: [
        "inferApprovalAction",
        "executeApprovePendingEvents",
        "validatePendingEventCandidate",
      ],
      executionRoute:
        typeof result?.meta?.execution_route === "string"
          ? result.meta.execution_route
          : undefined,
    },
    stateBefore,
    stateAfter,
    validationProof: validationProofFromRows(
      validationsAfter,
      validationsBefore.some((row) => row.blockedBy.includes("MISSING_DATE"))
        ? "MISSING_DATE"
        : "PASS"
    ),
    commitDecision: blocked ? "BLOCKED" : "EXECUTED",
    uiDiff: uiDiffFromResult(result),
    causalChain: blocked
      ? [
          "User clicked approve",
          "Validation: MISSING_DATE",
          "commit blocked",
          "UI: DATE_PICKER",
        ]
      : ["User clicked approve", "Validation passed", "commit executed"],
    extraAnomalies:
      validationsBefore.some((row) => row.blockedBy.includes("MISSING_DATE")) &&
      !blocked
        ? ["approve_without_date_should_block"]
        : undefined,
    }),
    result
  );
}

export function runDateStep(input: {
  patches: Array<{ candidateId: string; date: string }>;
  scopeId?: string;
  now?: Date;
  dryRun?: boolean;
  runtimeOwned?: boolean;
}): ReviewStepOutcome {
  const scopeId = input.scopeId ?? "default";
  const now = input.now ?? new Date();
  const clockIso = now.toISOString();
  const proofInput: CausalProofInput = {
    action: "date_selected",
    step: "date",
    scopeId,
    clockIso,
    patches: input.patches,
  };

  const stateBefore = snapshotEventOsState(scopeId, now);
  const revisionBefore = getActionProjectionRevision();

  const locked = runWithOptionalLock(scopeId, input.runtimeOwned, () => {
    if (input.dryRun) {
      return { ok: true, wouldPatch: true };
    }
    const message = `${OCR_REVIEW_DATES_PREFIX}${JSON.stringify({
      patches: input.patches,
    })}`;
    return orchestrateEventReviewDateResolution({ message, scopeId });
  });

  if (!locked.ok) {
    return stepOutcome(
      buildCausalProof({
        input: proofInput,
        plan: {
          triggeredFunction: "setCandidateDate",
          triggeredChain: ["applyPendingEventCandidateDatePatches"],
          intendedCommit: "PENDING_CONFIRM",
        },
        execution: {
          dryRun: Boolean(input.dryRun),
          stepsExecuted: [],
          blockedByLock: true,
          lockReason: locked.reason,
        },
        stateBefore,
        stateAfter: stateBefore,
        validationProof: validationProofFromRows([], "NONE"),
        commitDecision: "BLOCKED",
        uiDiff: "none",
        causalChain: ["Execution blocked: review scope locked"],
        extraAnomalies: ["execution_locked"],
      })
    );
  }

  const result = input.dryRun
    ? null
    : (locked.value as OrchestratorResult | null);
  const stateAfter = snapshotEventOsState(scopeId, now);
  const validations = validatePendingEventCandidates(
    loadPendingEventCandidates(reviewCandidateIds(scopeId), scopeId)
  );

  return stepOutcome(
    buildCausalProof({
    input: proofInput,
    plan: {
      triggeredFunction: "setCandidateDate → orchestrateEventReviewDateResolution",
      triggeredChain: [
        "parseOcrReviewDatePayload",
        "applyPendingEventCandidateDatePatches",
        "validatePendingEventCandidates",
      ],
      intendedCommit: "PENDING_CONFIRM",
    },
    execution: {
      dryRun: Boolean(input.dryRun),
      stepsExecuted: input.dryRun
        ? ["validatePendingEventCandidates (dry-run skip patch)"]
        : [
            "parseOcrReviewDatePayload",
            "applyPendingEventCandidateDatePatches",
            "validatePendingEventCandidates",
          ],
      executionRoute: result?.meta?.execution_route as string | undefined,
    },
    stateBefore,
    stateAfter: input.dryRun ? stateBefore : stateAfter,
    validationProof: validationProofFromRows(validations, "RESOLVED"),
    commitDecision: "PENDING_CONFIRM",
    uiDiff: input.dryRun ? "none" : uiDiffFromResult(result),
    causalChain: input.dryRun
      ? ["Dry-run date: no candidate patch applied"]
      : [
          "User selected date",
          "Candidate_State updated only",
          "SSOT unchanged",
          `Projection revision ${revisionBefore} → ${getActionProjectionRevision()}`,
          "UI: CONFIRM_SCREEN",
        ],
    }),
    result
  );
}

export function runConfirmStep(input: {
  message?: string;
  scopeId?: string;
  now?: Date;
  dryRun?: boolean;
  syncClient?: boolean;
  runtimeOwned?: boolean;
}): ReviewStepOutcome {
  const scopeId = input.scopeId ?? "default";
  const now = input.now ?? new Date();
  const clockIso = now.toISOString();
  const proofInput: CausalProofInput = {
    action: input.message ?? "confirm",
    step: "confirm",
    scopeId,
    clockIso,
    syncClient: input.syncClient,
  };

  const stateBefore = snapshotEventOsState(scopeId, now);
  const revisionBefore = getActionProjectionRevision();

  const locked = runWithOptionalLock(scopeId, input.runtimeOwned, () => {
    if (input.dryRun) {
      return planApproveCommit(scopeId);
    }
    return orchestrateEventReviewApproval({
      message: proofInput.action,
      scopeId,
    });
  });

  if (!locked.ok) {
    return stepOutcome(
      buildCausalProof({
        input: proofInput,
        plan: {
          triggeredFunction: "confirm",
          triggeredChain: ["commitOcrCandidateToEventStore"],
          intendedCommit: "BLOCKED",
        },
        execution: {
          dryRun: Boolean(input.dryRun),
          stepsExecuted: [],
          blockedByLock: true,
          lockReason: locked.reason,
        },
        stateBefore,
        stateAfter: stateBefore,
        validationProof: validationProofFromRows([], "NONE"),
        commitDecision: "BLOCKED",
        uiDiff: "none",
        causalChain: ["Execution blocked: review scope locked"],
        extraAnomalies: ["execution_locked"],
      })
    );
  }

  if (input.dryRun) {
    const plan = locked.value as ReturnType<typeof planApproveCommit>;
    return stepOutcome(
      buildCausalProof({
      input: proofInput,
      plan: {
        triggeredFunction: "confirm (dry-run)",
        triggeredChain: ["validatePendingEventCandidates"],
        intendedCommit: plan.commitDecision,
      },
      execution: { dryRun: true, stepsExecuted: ["validatePendingEventCandidates"] },
      stateBefore,
      stateAfter: stateBefore,
      validationProof: validationProofFromRows(
        plan.validations,
        plan.validationResult
      ),
      commitDecision: plan.commitDecision,
      uiDiff:
        plan.commitDecision === "EXECUTED"
          ? "calendar_update + action_overlay"
          : "show DATE_PICKER",
      causalChain: [
        "Dry-run confirm",
        plan.commitDecision === "EXECUTED"
          ? "Would write SSOT"
          : "Would remain blocked",
      ],
      })
    );
  }

  const result = locked.value as OrchestratorResult | null;
  const committed = result?.meta?.execution_route === "CALENDAR_COMMIT";

  const stateAfter = snapshotEventOsState(scopeId, now);
  const overlayRows = overlayCount(now);

  return stepOutcome(
    buildCausalProof({
    input: proofInput,
    plan: {
      triggeredFunction: "confirm → commitOcrCandidateToEventStore",
      triggeredChain: [
        "executeApprovePendingEvents",
        "commitOcrCandidateToEventStore",
        "upsertEventCandidate",
        "invalidateActionProjection",
      ],
      intendedCommit: committed ? "EXECUTED" : "BLOCKED",
    },
    execution: {
      dryRun: false,
      stepsExecuted: [
        "executeApprovePendingEvents",
        "commitOcrCandidateToEventStore",
        "invalidateActionProjection",
      ],
      executionRoute: result?.meta?.execution_route as string | undefined,
    },
    stateBefore,
    stateAfter,
    validationProof: validationProofFromRows([], "PASS"),
    commitDecision: committed ? "EXECUTED" : "BLOCKED",
    uiDiff: uiDiffFromResult(result),
    overlayRowCount: overlayRows,
    causalChain: [
      "User confirmed",
      "Validation passed",
      "Event SSOT written",
      `Projection ${revisionBefore} → ${getActionProjectionRevision()}`,
      `Overlay rows: ${overlayRows}`,
    ],
    extraAnomalies:
      committed && overlayRows === 0 ? ["overlay_empty_after_commit"] : undefined,
    }),
    result
  );
}
