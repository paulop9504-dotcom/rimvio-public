import type { MasterContextApiPayload } from "@/lib/action-chat/client-master-context";
import type { MasterOrchestratorContext } from "@/lib/action-chat/master-orchestrator-context";
import { defaultMasterOrchestratorContext } from "@/lib/action-chat/master-orchestrator-context";
import { normalizeActiveChains } from "@/lib/containers/container-types";
import { hydrateEventStoreFromTruthWire } from "@/lib/source-of-truth/hydrate-event-store";
import { readLifeProjections } from "@/lib/life-read-model";
import { buildTruthProjections } from "@/lib/source-of-truth/project-truth";
import { formatDateKey } from "@/lib/schedule/day-schedule";

function mapContainers(
  payload: Partial<MasterContextApiPayload>,
): MasterOrchestratorContext["activeContainers"] {
  return (payload.activeContainers ?? []).map((item) => {
    const now = new Date().toISOString();
    return {
      id: item.id,
      title: item.title,
      topic: item.topic ?? undefined,
      persona: item.persona ?? undefined,
      allowedActions: item.allowedActions ?? undefined,
      accent: item.accent ?? undefined,
      itemCount: item.itemCount,
      createdAt: now,
      updatedAt: now,
      lastOpenedAt: now,
      archivedAt: null,
    };
  });
}

/**
 * Server orchestrator — hydrate Event SSOT, then derive schedule/reminders.
 * Ignores client-only `existingSchedule` when `eventCandidates` is provided.
 */
export function resolveMasterContextFromTruth(
  payload?: Partial<MasterContextApiPayload> | null,
): MasterOrchestratorContext {
  if (!payload) {
    return defaultMasterOrchestratorContext();
  }

  const dateKey = payload.currentDate ?? formatDateKey();

  if (payload.eventCandidates?.length) {
    hydrateEventStoreFromTruthWire(payload.eventCandidates);
  }

  const life = readLifeProjections({ dateKey });
  const derived = buildTruthProjections(life.events, dateKey);

  const existingSchedule = payload.eventCandidates?.length
    ? derived.existingSchedule
    : (payload.existingSchedule ?? derived.existingSchedule);

  return defaultMasterOrchestratorContext({
    currentDate: dateKey,
    trustLevel: payload.trustLevel,
    existingSchedule,
    activeChains: payload.activeChains
      ? normalizeActiveChains(payload.activeChains)
      : [],
    activeChain: payload.activeChain ?? null,
    activeContainers: mapContainers(payload),
  });
}

/** Reminders for masterContext fields not on MasterOrchestratorContext. */
export function resolveAllRemindersFromTruth(
  payload?: Partial<MasterContextApiPayload> | null,
): MasterContextApiPayload["allReminders"] {
  if (!payload) {
    return [];
  }

  if (payload.eventCandidates?.length) {
    hydrateEventStoreFromTruthWire(payload.eventCandidates);
    return readLifeProjections({ dateKey: payload.currentDate }).allReminders;
  }

  if (payload.allReminders?.length) {
    return payload.allReminders;
  }

  return readLifeProjections({ dateKey: payload.currentDate }).allReminders;
}
