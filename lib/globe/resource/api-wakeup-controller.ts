import { scoreSpacetimeFit } from "@/lib/feed/spacetime-fit";
import { readApiWakeupPolicy } from "@/lib/globe/resource/api-wakeup-providers";
import type {
  ApiProviderId,
  ApiWakeupContext,
  ApiWakeupDecision,
  ApiWakeupPhase,
} from "@/lib/globe/resource/api-wakeup-types";
import {
  API_WAKEUP_COLD_LEAD_MS,
  API_WAKEUP_HOT_DISTANCE_KM,
  API_WAKEUP_HOT_LEAD_MS,
  API_WAKEUP_LODGING_HOT_DISTANCE_KM,
  API_WAKEUP_QUEUE_HOT_DISTANCE_KM,
  BACKGROUND_POLL_MULTIPLIER,
} from "@/lib/globe/resource/api-wakeup-types";

function parseMs(iso: string | null | undefined): number | null {
  if (!iso?.trim()) {
    return null;
  }
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? null : ms;
}

/** Shared spacetime phase — Ranker-adjacent, does not replace rankContextResources. */
export function resolveApiWakeupPhase(context: ApiWakeupContext): ApiWakeupPhase {
  const nowMs = parseMs(context.nowIso);
  const startMs = parseMs(context.eventStartIso);
  if (nowMs === null || startMs === null) {
    return "cold";
  }

  const msUntilStart = startMs - nowMs;
  if (msUntilStart > API_WAKEUP_COLD_LEAD_MS) {
    return "cold";
  }

  const fit = scoreSpacetimeFit({
    capturedAtIso: context.nowIso,
    lat: context.lat,
    lng: context.lng,
    eventStartIso: context.eventStartIso,
    eventEndIso: context.eventEndIso ?? null,
    eventPlace: context.eventPlace ?? null,
    eventLat: context.eventLat ?? null,
    eventLng: context.eventLng ?? null,
  });

  const hotByTime = msUntilStart <= API_WAKEUP_HOT_LEAD_MS;
  const hotByPlace =
    fit.placeOk &&
    (fit.distanceKm === null || fit.distanceKm <= API_WAKEUP_HOT_DISTANCE_KM);

  if (fit.fits || (hotByTime && hotByPlace)) {
    return "hot";
  }

  if (msUntilStart <= API_WAKEUP_COLD_LEAD_MS || fit.timeOk) {
    return "warm";
  }

  return "cold";
}

function queueTimesHotAllowed(context: ApiWakeupContext): boolean {
  const fit = scoreSpacetimeFit({
    capturedAtIso: context.nowIso,
    lat: context.lat,
    lng: context.lng,
    eventStartIso: context.eventStartIso,
    eventEndIso: context.eventEndIso ?? null,
    eventPlace: context.eventPlace ?? null,
    eventLat: context.eventLat ?? null,
    eventLng: context.eventLng ?? null,
  });
  return (
    fit.placeOk &&
    fit.distanceKm !== null &&
    fit.distanceKm <= API_WAKEUP_QUEUE_HOT_DISTANCE_KM
  );
}

function placesLodgingHotAllowed(context: ApiWakeupContext): boolean {
  const fit = scoreSpacetimeFit({
    capturedAtIso: context.nowIso,
    lat: context.lat,
    lng: context.lng,
    eventStartIso: context.eventStartIso,
    eventEndIso: context.eventEndIso ?? null,
    eventPlace: context.eventPlace ?? null,
    eventLat: context.eventLat ?? null,
    eventLng: context.eventLng ?? null,
  });
  return (
    fit.timeOk &&
    fit.placeOk &&
    (fit.distanceKm === null || fit.distanceKm <= API_WAKEUP_LODGING_HOT_DISTANCE_KM)
  );
}

function isSyncGapSatisfied(input: {
  phase: ApiWakeupPhase;
  lastSyncedAtIso: string | null | undefined;
  minGapMs: number;
  nowMs: number;
}): boolean {
  if (input.phase === "cold" || input.minGapMs <= 0) {
    return true;
  }
  const lastMs = parseMs(input.lastSyncedAtIso ?? null);
  if (lastMs === null) {
    return true;
  }
  return input.nowMs - lastMs >= input.minGapMs;
}

/**
 * Gatekeeper for all external API fetch / poll loops.
 * Hub and Ranker must not call third-party APIs directly — go through here.
 */
export function resolveApiWakeupDecision(
  providerId: ApiProviderId,
  context: ApiWakeupContext,
): ApiWakeupDecision {
  const policy = readApiWakeupPolicy(providerId);
  const phase = resolveApiWakeupPhase(context);
  const nowMs = parseMs(context.nowIso) ?? Date.now();

  if (providerId === "queue_times") {
    if (!queueTimesHotAllowed(context)) {
      return {
        providerId,
        phase: "cold",
        allowFetch: false,
        pollIntervalMs: null,
        reason: "queue_times_requires_geo_hot",
      };
    }
  }

  if (providerId === "places_lodging" && phase === "hot" && !placesLodgingHotAllowed(context)) {
    return {
      providerId,
      phase: "warm",
      allowFetch: policy.warm.allowFetch,
      pollIntervalMs: policy.warm.allowFetch ? policy.warm.pollIntervalMs : null,
      reason: "places_lodging_warm_fallback",
    };
  }

  if (providerId === "ticket_ingest" && phase === "hot") {
    return {
      providerId,
      phase,
      allowFetch: false,
      pollIntervalMs: null,
      reason: "ticket_ingest_sleep_in_hot",
    };
  }

  const phasePolicy = policy[phase];
  let pollIntervalMs = phasePolicy.pollIntervalMs;

  if (
    context.appForeground === false &&
    pollIntervalMs !== null &&
    phase === "hot"
  ) {
    pollIntervalMs *= BACKGROUND_POLL_MULTIPLIER;
  }

  const minGapMs =
    phase === "hot"
      ? policy.minSyncGapMs.hot
      : phase === "warm"
        ? policy.minSyncGapMs.warm
        : 0;

  const gapOk = isSyncGapSatisfied({
    phase,
    lastSyncedAtIso: context.lastSyncedAtIso,
    minGapMs,
    nowMs,
  });

  const allowFetch = phasePolicy.allowFetch && gapOk;

  return {
    providerId,
    phase,
    allowFetch,
    pollIntervalMs: allowFetch ? pollIntervalMs : null,
    reason: allowFetch
      ? `allow_${phase}`
      : gapOk
        ? `deny_${phase}`
        : `sync_gap_${phase}`,
  };
}

/** Shortest poll interval among allowed targets (for hook timers). */
export function minPollIntervalMs(
  decisions: readonly ApiWakeupDecision[],
): number | null {
  let min: number | null = null;
  for (const decision of decisions) {
    if (decision.pollIntervalMs === null) {
      continue;
    }
    if (min === null || decision.pollIntervalMs < min) {
      min = decision.pollIntervalMs;
    }
  }
  return min;
}

export function anyWakeupFetchAllowed(
  decisions: readonly ApiWakeupDecision[],
): boolean {
  return decisions.some((decision) => decision.allowFetch);
}
