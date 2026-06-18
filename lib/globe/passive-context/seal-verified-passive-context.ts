import type { EventCandidate } from "@/lib/events/event-candidate";
import { appendActionTelemetry } from "@/lib/archive/action-telemetry-store";
import { buildArchiveContextKey } from "@/lib/archive/build-archived-event";
import { syncLearningRollupFromTelemetry } from "@/lib/archive/sync-learning-rollup-from-telemetry";
import { createPersonalGlobePinFromEvent } from "@/lib/globe/create-personal-globe-pin";
import { inferExecutionProfileFromText } from "@/lib/globe/passive-context/infer-execution-profile";
import { resolveParentTravelContextEventId } from "@/lib/globe/passive-context/resolve-parent-travel-context";
import {
  EXECUTION_PROFILE_META_KEY,
  PARENT_CONTEXT_EVENT_ID_META_KEY,
  PASSIVE_CONTEXT_SEALED_AT_META_KEY,
} from "@/lib/globe/passive-context/types";
import { buildPlaceScopedLearningContextKey } from "@/lib/globe/passive-context/build-place-scoped-learning-key";
import { commitEventUpsert } from "@/lib/source-of-truth/commit-truth";

function readFiniteCoord(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function recordHighTrustPassiveVerify(input: {
  event: EventCandidate;
  at: string;
}) {
  appendActionTelemetry({
    eventId: input.event.id,
    actionId: "passive_context:verify",
    label: input.event.place?.trim() || input.event.title.trim() || "location",
    tier: "MAIN",
    kind: "executed",
    surface: "passive_verify",
    phase: "hot",
    at: input.at,
  });

  const placeKey = buildPlaceScopedLearningContextKey(
    input.event.place?.trim() ||
      (typeof input.event.metadata?.gpsDwellPlaceLabel === "string"
        ? input.event.metadata.gpsDwellPlaceLabel
        : null),
  );
  if (placeKey) {
    appendActionTelemetry({
      eventId: input.event.id,
      actionId: `place_verify:${placeKey}`,
      label: placeKey,
      tier: "MAIN",
      kind: "executed",
      surface: "passive_verify",
      phase: "hot",
      at: input.at,
    });
    syncLearningRollupFromTelemetry({
      telemetryEventId: input.event.id,
      contextKey: placeKey,
    });
  }

  syncLearningRollupFromTelemetry({
    telemetryEventId: input.event.id,
    contextKey: buildArchiveContextKey(input.event),
  });
}

/** After L2.5 verify — stamp coords, profile, parent link, globe pin, learning. */
export function sealVerifiedPassiveContext(
  event: EventCandidate,
  now = new Date(),
): EventCandidate {
  if (event.metadata?.[PASSIVE_CONTEXT_SEALED_AT_META_KEY]) {
    return event;
  }

  const meta = event.metadata ?? {};
  const lat =
    readFiniteCoord(meta.gpsDwellLat) ?? readFiniteCoord(meta.globePlaceLat);
  const lng =
    readFiniteCoord(meta.gpsDwellLng) ?? readFiniteCoord(meta.globePlaceLng);
  const placeHay = [
    event.place?.trim(),
    typeof meta.gpsDwellPlaceLabel === "string" ? meta.gpsDwellPlaceLabel : null,
    event.title.trim(),
  ]
    .filter(Boolean)
    .join(" ");
  const profile = inferExecutionProfileFromText(placeHay);
  const parentContextEventId = resolveParentTravelContextEventId(event);
  const stamp = now.toISOString();

  const saved = commitEventUpsert({
    id: event.id,
    title: event.title,
    category: event.category,
    source: event.source,
    lifecycle: event.lifecycle,
    datetime: event.datetime,
    place: event.place,
    containerId: parentContextEventId ?? event.containerId,
    description: event.description,
    metadata: {
      ...meta,
      globePlaceLat: lat ?? meta.globePlaceLat,
      globePlaceLng: lng ?? meta.globePlaceLng,
      globePlaceConfirmed: lat != null && lng != null ? true : meta.globePlaceConfirmed,
      [PASSIVE_CONTEXT_SEALED_AT_META_KEY]: stamp,
      ...(profile ? { [EXECUTION_PROFILE_META_KEY]: profile } : {}),
      ...(parentContextEventId
        ? { [PARENT_CONTEXT_EVENT_ID_META_KEY]: parentContextEventId }
        : {}),
      passiveContextKind:
        meta.targetingSource === "gps_background" ? "gps_dwell" : "photo_place",
    },
    confidence: Math.min(0.98, event.confidence + 0.04),
    lifecycleUpdatedAt: stamp,
    updatedAt: stamp,
  });

  createPersonalGlobePinFromEvent({ event: saved, now });
  recordHighTrustPassiveVerify({ event: saved, at: stamp });
  return saved;
}

/** @deprecated alias */
export const sealVerifiedGpsDwellContext = sealVerifiedPassiveContext;
