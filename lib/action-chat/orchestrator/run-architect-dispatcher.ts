import { actionIntentToMasterWire } from "@/lib/action-dispatcher/action-intent-to-master-wire";
import { parseActionIntentWire } from "@/lib/action-dispatcher/parse-action-intent-wire";
import { resolveDockAction } from "@/lib/action-dispatcher/resolve-dock-execution";
import { dockUpdateToMasterWire } from "@/lib/action-os/dock-update-to-master-wire";
import type { DockActionWire, DockUpdateWire } from "@/lib/action-os/types";
import { normalizeMasterOrchestratorWire } from "@/lib/action-chat/normalize-master-result";
import { extractActionIntentFromResult } from "@/lib/action-chat/orchestrator/extract-action-intent-from-result";
import type { OrchestratorTrace } from "@/lib/action-chat/orchestrator/orchestrator-trace";
import {
  mergeOrchestratorMetadata,
  type OrchestratorResult,
} from "@/lib/action-chat/orchestrator-types";
import type { ExistingScheduleInput } from "@/lib/schedule/day-schedule";

export type ArchitectDispatcherInput = {
  result: OrchestratorResult;
  message?: string;
  trace?: OrchestratorTrace;
  existingSchedule?: ExistingScheduleInput;
};

function hasDispatchableIntent(
  result: OrchestratorResult,
  message?: string
): boolean {
  const dockId = (
    result.actionOsDock?.main_action?.execution as { action_id?: string } | undefined
  )?.action_id?.trim();
  if (dockId) {
    return true;
  }
  return extractActionIntentFromResult(result, message) !== null;
}

function shouldSkipArchitectDispatch(
  result: OrchestratorResult,
  message?: string
): boolean {
  if (hasDispatchableIntent(result, message)) {
    return false;
  }

  if (result.pendingConfirm) {
    return true;
  }
  if (result.confirmation?.meta?.intent) {
    return true;
  }
  if (result.guardrail?.decision) {
    return true;
  }
  if (result.policy) {
    return true;
  }
  if (
    result.experienceChoice ||
    result.entityQuickPick ||
    result.timeChoice ||
    result.scheduleAdvisory
  ) {
    return true;
  }
  if (!result.actions?.length && !result.actionOsDock) {
    return true;
  }
  if (
    result.schedule?.tasks?.length &&
    !result.actions?.length &&
    !result.actionOsDock
  ) {
    return true;
  }
  return false;
}

function mergeDispatchedResult(
  original: OrchestratorResult,
  dispatched: OrchestratorResult
): OrchestratorResult {
  return {
    ...dispatched,
    summary: original.summary || dispatched.summary,
    thought: original.thought ?? dispatched.thought,
    globalBrain: original.globalBrain,
    schedule: original.schedule ?? dispatched.schedule,
    confirmation: original.confirmation ?? dispatched.confirmation,
    presentation: original.presentation,
    entityQuickPick: original.entityQuickPick,
    cafeDiscovery: original.cafeDiscovery,
    knowledgeSaved: original.knowledgeSaved,
    guardrail: original.guardrail,
    policy: original.policy,
    metadata: mergeOrchestratorMetadata(dispatched.metadata, original.metadata ?? {}),
    orchestratorTrace: original.orchestratorTrace,
  };
}

function dispatchFromIntent(
  input: ArchitectDispatcherInput,
  intent: NonNullable<ReturnType<typeof parseActionIntentWire>>
): OrchestratorResult {
  input.trace?.hit(3, 11, "Architect", intent.action_id);
  input.trace?.hit(3, 12, "Dispatcher", intent.action_id);
  const wire = actionIntentToMasterWire(intent);
  const dispatched = normalizeMasterOrchestratorWire({
    wire,
    source: input.result.source,
    existingSchedule: input.existingSchedule ?? [],
  });
  return mergeDispatchedResult(input.result, dispatched);
}

function resolveDockThroughDispatch(
  dock: DockUpdateWire,
  input: ArchitectDispatcherInput
): OrchestratorResult | null {
  const mainExec = dock.main_action.execution as DockActionWire["execution"] & {
    action_id?: string;
    params?: Record<string, string>;
  };

  if (mainExec.action_id?.trim()) {
    const intent = parseActionIntentWire(
      {
        action_id: mainExec.action_id,
        params: mainExec.params ?? {},
        fallback_url: "https://map.naver.com",
        thought: input.result.thought,
      },
      input.message
    );
    if (intent) {
      return dispatchFromIntent(input, intent);
    }
  }

  const resolvedMain = resolveDockAction(
    dock.main_action as DockActionWire & {
      execution: DockActionWire["execution"] & {
        action_id?: string;
        params?: Record<string, string>;
      };
    }
  );
  const resolvedShadows = dock.shadow_actions.map((item) =>
    resolveDockAction(
      item as DockActionWire & {
        execution: DockActionWire["execution"] & {
          action_id?: string;
          params?: Record<string, string>;
        };
      }
    )
  );

  const uriChanged =
    resolvedMain.execution.uri !== dock.main_action.execution.uri ||
    resolvedShadows.some(
      (shadow, index) => shadow.execution.uri !== dock.shadow_actions[index]?.execution.uri
    );

  if (!uriChanged) {
    return null;
  }

  input.trace?.hit(3, 11, "Architect", "dock");
  input.trace?.hit(3, 12, "Dispatcher", "dock_resolve");
  const wire = dockUpdateToMasterWire({
    ...dock,
    main_action: resolvedMain,
    shadow_actions: resolvedShadows,
  });
  const dispatched = normalizeMasterOrchestratorWire({
    wire,
    source: input.result.source,
    existingSchedule: input.existingSchedule ?? [],
  });
  return mergeDispatchedResult(input.result, dispatched);
}

/** Phase 3 · Tier 11/12 — sanitize intent + registry dispatch for every actionable result. */
export function runArchitectDispatcher(
  input: ArchitectDispatcherInput
): OrchestratorResult {
  if (shouldSkipArchitectDispatch(input.result, input.message)) {
    input.trace?.pass(3, 11, "Architect");
    return input.result;
  }

  if (input.result.actionOsDock) {
    const fromDock = resolveDockThroughDispatch(input.result.actionOsDock, input);
    if (fromDock) {
      return fromDock;
    }
  }

  const intent = extractActionIntentFromResult(input.result, input.message);
  if (intent) {
    return dispatchFromIntent(input, intent);
  }

  input.trace?.pass(3, 11, "Architect");
  return input.result;
}
