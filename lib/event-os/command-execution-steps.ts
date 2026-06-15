import type { OrchestratorResult } from "@/lib/action-chat/orchestrator-types";
import { composeActionProjection } from "@/lib/action-projection/compose-action-projection";
import { orchestrateEntityQuickPick } from "@/lib/context-resolver/discovery/orchestrate-entity-quick-pick";
import { orchestratePlaceRecommendation } from "@/lib/context-resolver/discovery/orchestrate-place-recommendation";
import { getCommandEventCandidate } from "@/lib/command-os/command-event-candidate-store";
import { buildCausalProof, validationProofFromRows } from "@/lib/event-os/build-causal-proof";
import type { CausalProof, CausalProofInput } from "@/lib/event-os/causal-proof-types";
import type { CommandOsExecutionPayload } from "@/lib/event-os/review-execution-types";
import {
  runWithOptionalLock,
  type ReviewStepOutcome,
} from "@/lib/event-os/execution-steps";
import { snapshotEventOsState } from "@/lib/event-os/snapshot-event-os-state";

function stepOutcome(
  proof: CausalProof,
  orchestrator: OrchestratorResult | null = null
): ReviewStepOutcome {
  return { proof, orchestrator };
}

function commandProofInput(
  payload: CommandOsExecutionPayload,
  step: CausalProofInput["step"],
  scopeId: string,
  clockIso: string
): CausalProofInput {
  return {
    action: payload.rawInput,
    step,
    scopeId,
    clockIso,
  };
}

export function runSearchStep(input: {
  payload: CommandOsExecutionPayload;
  scopeId?: string;
  now?: Date;
  runtimeOwned?: boolean;
}): ReviewStepOutcome {
  const scopeId = input.scopeId ?? input.payload.eventCandidateId;
  const now = input.now ?? new Date();
  const clockIso = now.toISOString();
  const stateBefore = snapshotEventOsState(scopeId, now);

  const locked = runWithOptionalLock(scopeId, input.runtimeOwned, () =>
    orchestratePlaceRecommendation(input.payload.normalizedQuery, {
      history: [],
    })
  );

  if (!locked.ok) {
    return stepOutcome(
      buildCausalProof({
        input: commandProofInput(input.payload, "search", scopeId, clockIso),
        plan: {
          triggeredFunction: "command:search",
          triggeredChain: ["orchestratePlaceRecommendation"],
          intendedCommit: "BLOCKED",
        },
        execution: {
          dryRun: false,
          stepsExecuted: [],
          blockedByLock: true,
          lockReason: locked.reason,
        },
        stateBefore,
        stateAfter: stateBefore,
        validationProof: validationProofFromRows([], "NONE"),
        commitDecision: "BLOCKED",
        uiDiff: "none",
        causalChain: ["Command OS search blocked by lock"],
      })
    );
  }

  const result = locked.value;
  const stateAfter = snapshotEventOsState(scopeId, now);

  return stepOutcome(
    buildCausalProof({
      input: commandProofInput(input.payload, "search", scopeId, clockIso),
      plan: {
        triggeredFunction: "command:search → orchestratePlaceRecommendation",
        triggeredChain: ["CommandParser", "IntentResolver", "enqueue", "search"],
        intendedCommit: "NONE",
      },
      execution: {
        dryRun: false,
        stepsExecuted: ["orchestratePlaceRecommendation"],
        executionRoute: result?.meta?.execution_route as string | undefined,
      },
      stateBefore,
      stateAfter,
      validationProof: validationProofFromRows([], "NONE"),
      commitDecision: "NONE",
      uiDiff: result?.cafeDiscovery ? "calendar_update + action_overlay" : "none",
      causalChain: [
        `Command @${input.payload.command} resolved to SEARCH`,
        `Query: ${input.payload.normalizedQuery}`,
        "No direct SSOT mutation from compiler layer",
      ],
    }),
    result
  );
}

export function runActionStep(input: {
  payload: CommandOsExecutionPayload;
  scopeId?: string;
  now?: Date;
  runtimeOwned?: boolean;
}): ReviewStepOutcome {
  const scopeId = input.scopeId ?? input.payload.eventCandidateId;
  const now = input.now ?? new Date();
  const clockIso = now.toISOString();
  const stateBefore = snapshotEventOsState(scopeId, now);

  const locked = runWithOptionalLock(scopeId, input.runtimeOwned, () => {
    const quickPick = orchestrateEntityQuickPick(input.payload.normalizedQuery);
    if (quickPick) {
      return quickPick;
    }
    const projection = composeActionProjection({ now });
    return {
      summary: `액션 ${projection.entries.length}건이 활성 상태예요.`,
      actions: [],
      source: "rules" as const,
      confidence: 0.85,
      metadata: { intent: "ACTION", trust_level_adjustment: "NONE" },
      meta: {
        intent_type: "CONTINUE" as const,
        requires_context_switch: false,
        execution_route: "COMMAND_ACTION_QUERY",
      },
    } satisfies OrchestratorResult;
  });

  if (!locked.ok) {
    return stepOutcome(
      buildCausalProof({
        input: commandProofInput(input.payload, "action", scopeId, clockIso),
        plan: {
          triggeredFunction: "command:action",
          triggeredChain: ["composeActionProjection"],
          intendedCommit: "BLOCKED",
        },
        execution: {
          dryRun: false,
          stepsExecuted: [],
          blockedByLock: true,
          lockReason: locked.reason,
        },
        stateBefore,
        stateAfter: stateBefore,
        validationProof: validationProofFromRows([], "NONE"),
        commitDecision: "BLOCKED",
        uiDiff: "none",
        causalChain: ["Command OS action query blocked by lock"],
      })
    );
  }

  const result = locked.value;
  const stateAfter = snapshotEventOsState(scopeId, now);

  return stepOutcome(
    buildCausalProof({
      input: commandProofInput(input.payload, "action", scopeId, clockIso),
      plan: {
        triggeredFunction: "command:action",
        triggeredChain: [
          "orchestrateEntityQuickPick",
          "composeActionProjection",
        ],
        intendedCommit: "NONE",
      },
      execution: {
        dryRun: false,
        stepsExecuted: ["action_query"],
        executionRoute: result?.meta?.execution_route as string | undefined,
      },
      stateBefore,
      stateAfter,
      validationProof: validationProofFromRows([], "NONE"),
      commitDecision: "NONE",
      uiDiff: "none",
      causalChain: [
        `Command @${input.payload.command} resolved to ACTION_QUERY`,
        `Query: ${input.payload.normalizedQuery}`,
      ],
    }),
    result
  );
}

export function runCommandCreateStep(input: {
  payload: CommandOsExecutionPayload;
  scopeId?: string;
  now?: Date;
  runtimeOwned?: boolean;
}): ReviewStepOutcome {
  const candidate = getCommandEventCandidate(input.payload.eventCandidateId);
  const scopeId = input.scopeId ?? input.payload.eventCandidateId;
  const now = input.now ?? new Date();
  const clockIso = now.toISOString();
  const stateBefore = snapshotEventOsState("default", now);

  const subject =
    input.payload.extractedContext.subject ??
    candidate?.extractedContext.subject ??
    input.payload.normalizedQuery;
  const time =
    input.payload.extractedContext.time ??
    candidate?.extractedContext.time ??
    null;
  const date =
    input.payload.extractedContext.date ??
    candidate?.extractedContext.date ??
    new Date().toISOString().slice(0, 10);

  const message = [date, time, subject].filter(Boolean).join(" ").trim();

  const locked = runWithOptionalLock(scopeId, input.runtimeOwned, () => ({
    ok: true,
    message,
    candidate,
  }));

  if (!locked.ok) {
    return stepOutcome(
      buildCausalProof({
        input: commandProofInput(input.payload, "command", scopeId, clockIso),
        plan: {
          triggeredFunction: "command:create_event",
          triggeredChain: ["compileCommand"],
          intendedCommit: "BLOCKED",
        },
        execution: {
          dryRun: false,
          stepsExecuted: [],
          blockedByLock: true,
          lockReason: locked.reason,
        },
        stateBefore,
        stateAfter: stateBefore,
        validationProof: validationProofFromRows([], "NONE"),
        commitDecision: "BLOCKED",
        uiDiff: "none",
        causalChain: ["CREATE_EVENT compile blocked"],
      })
    );
  }

  const stateAfter = snapshotEventOsState("default", now);
  const needsDate = !time;

  return stepOutcome(
    buildCausalProof({
      input: commandProofInput(input.payload, "command", scopeId, clockIso),
      plan: {
        triggeredFunction: "command:create_event → review pipeline",
        triggeredChain: [
          "CommandParser",
          "IntentResolver",
          "EventCandidate",
          "enqueueReviewExecution",
        ],
        intendedCommit: needsDate ? "BLOCKED" : "PENDING_CONFIRM",
      },
      execution: {
        dryRun: false,
        stepsExecuted: ["compile_command_ast", "map_intent_create"],
      },
      stateBefore,
      stateAfter,
      validationProof: validationProofFromRows(
        [],
        needsDate ? "MISSING_DATE" : "RESOLVED"
      ),
      commitDecision: needsDate ? "BLOCKED" : "PENDING_CONFIRM",
      uiDiff: needsDate ? "show DATE_PICKER" : "show CONFIRM_SCREEN",
      causalChain: [
        `CREATE_EVENT from @${input.payload.command}`,
        `subject=${subject}`,
        time ? `time=${time}` : "time=missing",
        "Compiler only — SSOT commit via orchestrator approve path",
      ],
    }),
    {
      summary: time
        ? `${subject} 일정을 검토할게요.`
        : `${subject} 일정에 시간이 필요해요.`,
      actions: [],
      source: "rules",
      confidence: 0.9,
      metadata: { intent: "SCHEDULE", trust_level_adjustment: "NONE" },
      meta: {
        intent_type: "CONTINUE",
        requires_context_switch: false,
        execution_route: needsDate
          ? "EVENT_REVIEW_DATE_PICKER"
          : "EVENT_REVIEW_DATE_CONFIRM",
      },
    }
  );
}
