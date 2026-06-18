import type { OrchestratorResult } from "@/lib/action-chat/orchestrator-types";
import type { IntentRoute } from "@/lib/action-chat/intent-router";
import type { MasterContextApiPayload } from "@/lib/action-chat/client-master-context";
import type { MasterOrchestratorContext } from "@/lib/action-chat/master-orchestrator-context";
import { assembleGlobalBrainContext } from "@/lib/global-brain/assemble-global-brain-context";
import {
  gatherTurnContext,
  gatherTurnContextDegraded,
} from "@/lib/global-brain/gather-turn-context";
import type { GlobalBrainSnapshot, UserStatusRecord } from "@/lib/global-brain/types";
import type { GlobalBrainWire } from "@/lib/global-brain/types";
import type { VitalityStateMatch } from "@/lib/vitality-state/vitality-state-types";
import type { TemporalResolution } from "@/lib/time/temporal-types";
import type { GoalSnapshot } from "@/lib/goal-engine/types";
import { promotedApiWireToEntries } from "@/lib/action-registry/action-registry-store";

export type GlobalBrainMiddlewareResult = {
  snapshot: GlobalBrainSnapshot;
  promptBlock: string;
  shouldEnrich: boolean;
  vitalityMatch: VitalityStateMatch | null;
  statusPatch: UserStatusRecord | null;
  preferencePatch: { key: string; value: string; label: string } | null;
  nexusContactTouch: { name: string } | null;
  resolvedTemporal: TemporalResolution | null;
  proactiveResult: OrchestratorResult | null;
  actionEventUpsert: GlobalBrainWire["actionEventUpsert"];
};

/**
 * Turn hook: gather upstream context, then assemble the Global Brain prompt block only.
 */
export async function runGlobalBrainMiddleware(input: {
  message: string;
  masterContext?: MasterContextApiPayload | null;
  route: IntentRoute;
  context: MasterOrchestratorContext;
  /** Read-only; injected into GLOBAL_BRAIN_SNAPSHOT as goal_snapshot. */
  goalSnapshot?: GoalSnapshot | null;
}): Promise<GlobalBrainMiddlewareResult> {
  try {
    const gathered = await gatherTurnContext(input);
    const { promptBlock, shouldEnrich } = assembleGlobalBrainContext({
      snapshot: gathered.snapshot,
      message: input.message,
      promotedTemplates: promotedApiWireToEntries(
        input.masterContext?.promotedActionTemplates,
      ),
      goalSnapshot: input.goalSnapshot ?? null,
      activeContextId: input.masterContext?.globeContextEventId ?? null,
      pinScope: input.masterContext?.pinScopeHint ?? "internal",
    });
    return { ...gathered, promptBlock, shouldEnrich };
  } catch (error) {
    console.error("[global-brain] middleware failed — degrading", error);
    const gathered = gatherTurnContextDegraded(input);
    return {
      ...gathered,
      promptBlock: "",
      shouldEnrich: false,
    };
  }
}
