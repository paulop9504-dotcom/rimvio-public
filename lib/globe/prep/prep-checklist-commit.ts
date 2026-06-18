import type { EventCandidate } from "@/lib/events/event-candidate";
import { appendActionTelemetry } from "@/lib/archive/action-telemetry-store";
import { buildArchiveContextKey } from "@/lib/archive/build-archived-event";
import { syncLearningRollupFromTelemetry } from "@/lib/archive/sync-learning-rollup-from-telemetry";
import {
  inferExecutionProfileFromText,
  readExecutionProfileId,
} from "@/lib/globe/passive-context/infer-execution-profile";
import { EXECUTION_PROFILE_META_KEY } from "@/lib/globe/passive-context/types";
import {
  buildPrepChecklistState,
  readPrepChecklistState,
} from "@/lib/globe/prep/prep-checklist-state";
import {
  PREP_CHECKLIST_META_KEY,
  type PrepChecklistItemId,
} from "@/lib/globe/prep/prep-types";
import { commitEventUpsert } from "@/lib/source-of-truth/commit-truth";

export function ensurePrepChecklistOnEvent(input: {
  event: EventCandidate;
  now?: Date;
}): EventCandidate {
  const built = buildPrepChecklistState(input);
  if (!built || readPrepChecklistState(input.event)) {
    return input.event;
  }
  const stamp = (input.now ?? new Date()).toISOString();
  return commitEventUpsert({
    id: input.event.id,
    title: input.event.title,
    category: input.event.category,
    source: input.event.source,
    lifecycle: input.event.lifecycle,
    datetime: input.event.datetime,
    place: input.event.place,
    description: input.event.description,
    metadata: {
      ...(input.event.metadata ?? {}),
      [PREP_CHECKLIST_META_KEY]: built,
    },
    confidence: input.event.confidence,
    lifecycleUpdatedAt: stamp,
    updatedAt: stamp,
  });
}

export function togglePrepChecklistItem(input: {
  event: EventCandidate;
  itemId: PrepChecklistItemId;
  now?: Date;
}): EventCandidate {
  const profileId = readExecutionProfileId(input.event.metadata);
  if (!profileId) {
    return input.event;
  }

  const now = input.now ?? new Date();
  const nowIso = now.toISOString();
  let state = readPrepChecklistState(input.event);
  if (!state) {
    state = buildPrepChecklistState({ event: input.event, now });
  }
  if (!state) {
    return input.event;
  }

  const nextItems = state.items.map((row) => {
    if (row.id !== input.itemId) {
      return row;
    }
    const checked = !row.checked;
    return {
      ...row,
      checked,
      checkedAtIso: checked ? nowIso : null,
    };
  });

  appendActionTelemetry({
    eventId: input.event.id,
    actionId: `prep_check:${input.itemId}`,
    label: input.itemId,
    tier: "AUX",
    kind: "clicked",
    surface: "prep_checklist",
    at: nowIso,
  });
  syncLearningRollupFromTelemetry({
    telemetryEventId: input.event.id,
    contextKey: buildArchiveContextKey(input.event),
  });

  return commitEventUpsert({
    id: input.event.id,
    title: input.event.title,
    category: input.event.category,
    source: input.event.source,
    lifecycle: input.event.lifecycle,
    datetime: input.event.datetime,
    place: input.event.place,
    description: input.event.description,
    metadata: {
      ...(input.event.metadata ?? {}),
      [PREP_CHECKLIST_META_KEY]: {
        profileId,
        updatedAtIso: nowIso,
        items: nextItems,
      },
    },
    confidence: input.event.confidence,
    lifecycleUpdatedAt: nowIso,
    updatedAt: nowIso,
  });
}

/** Stamp execution profile from user-facing label (e.g. 디즈니랜드 투어). */
export function stampExecutionProfileOnEvent(input: {
  event: EventCandidate;
  label: string;
  now?: Date;
}): EventCandidate {
  if (readExecutionProfileId(input.event.metadata)) {
    return ensurePrepChecklistOnEvent({ event: input.event, now: input.now });
  }
  const profile = inferExecutionProfileFromText(input.label);
  if (!profile) {
    return input.event;
  }
  const stamp = (input.now ?? new Date()).toISOString();
  const withProfile = commitEventUpsert({
    id: input.event.id,
    title: input.event.title,
    category: input.event.category,
    source: input.event.source,
    lifecycle: input.event.lifecycle,
    datetime: input.event.datetime,
    place: input.event.place,
    description: input.event.description,
    metadata: {
      ...(input.event.metadata ?? {}),
      [EXECUTION_PROFILE_META_KEY]: profile,
    },
    confidence: input.event.confidence,
    lifecycleUpdatedAt: stamp,
    updatedAt: stamp,
  });
  return ensurePrepChecklistOnEvent({ event: withProfile, now: input.now });
}
