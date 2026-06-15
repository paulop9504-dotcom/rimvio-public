import type { GlobalBrainSnapshot } from "@/lib/global-brain/types";
import type { GoalSnapshot } from "@/lib/goal-engine/types";
import { buildGlobalBrainContextBlock } from "@/lib/global-brain/build-context-injection-block";
import { isConversationalOnlyMessage } from "@/lib/action-chat/conversation-turns";
import type { ActionRegistryEntry } from "@/lib/action-registry/types";

/**
 * Global Brain — context assembler only.
 * Does not classify vitality, resolve time, detect horizon, or route orchestrator turns.
 */
export function shouldEnrichGlobalBrainContext(input: {
  message: string;
  snapshot: GlobalBrainSnapshot;
}): boolean {
  if (input.snapshot.scheduleListBatch) {
    return true;
  }
  if (input.snapshot.resolvedTemporal) {
    return true;
  }
  if (input.snapshot.userLocation?.spatial_mode !== "unknown") {
    return true;
  }
  if (input.snapshot.userStatus) {
    return true;
  }
  if (input.snapshot.eventHorizon.length > 0) {
    return true;
  }
  if (input.snapshot.remainingSchedule.length > 0) {
    return true;
  }
  if (input.snapshot.userGoals.length > 0) {
    return true;
  }
  if (input.snapshot.preferences.length > 0) {
    return true;
  }
  if (!isConversationalOnlyMessage(input.message.trim())) {
    return true;
  }
  return false;
}

export function assembleGlobalBrainContext(input: {
  snapshot: GlobalBrainSnapshot;
  promotedTemplates?: ActionRegistryEntry[];
  goalSnapshot?: GoalSnapshot | null;
  message: string;
}): { promptBlock: string; shouldEnrich: boolean } {
  const shouldEnrich = shouldEnrichGlobalBrainContext({
    message: input.message,
    snapshot: input.snapshot,
  });
  const promptBlock = buildGlobalBrainContextBlock({
    snapshot: input.snapshot,
    shouldEnrich,
    promotedTemplates: input.promotedTemplates,
    goalSnapshot: input.goalSnapshot ?? null,
  });
  return { promptBlock, shouldEnrich };
}
