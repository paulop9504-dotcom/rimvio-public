import type { RankedContextResource } from "@/lib/globe/resource/map-hub-service-to-resource";
import type {
  CurationImpressionSurface,
  PredictiveCurationTelemetryBase,
  PredictiveCurationTelemetryEvent,
  SpacetimeTelemetryContext,
} from "@/types/telemetry";
import { hashTelemetryUserId } from "@/lib/telemetry/hash-telemetry-user-id";

export function buildSpacetimeContextFromResource(
  entry: RankedContextResource,
  carouselIndex: number,
): SpacetimeTelemetryContext {
  const { resource, rankScore } = entry;
  return {
    event_start_iso: resource.spacetime.validFromIso ?? null,
    event_end_iso: resource.spacetime.validUntilIso ?? null,
    event_place_label: resource.spacetime.placeLabel ?? null,
    event_lat: resource.spacetime.lat ?? null,
    event_lng: resource.spacetime.lng ?? null,
    rank_score: rankScore,
    carousel_index: carouselIndex,
    resource_kind: resource.kind,
    source_hub_id: resource.sourceHubId,
  };
}

export function buildCurationTelemetryBase(input: {
  contextId: string;
  entry: RankedContextResource;
  lat: number | null;
  lng: number | null;
  userSeed: string;
  dwellTimeMs?: number | null;
  at?: string;
}): PredictiveCurationTelemetryBase {
  return {
    event_type: "RESOURCE_IMPRESSION",
    user_id: hashTelemetryUserId(input.userSeed),
    context_id: input.contextId,
    resource_id: input.entry.resource.resourceId,
    current_lat: input.lat,
    current_lng: input.lng,
    timestamp: input.at ?? new Date().toISOString(),
    dwell_time: input.dwellTimeMs ?? null,
  };
}

export function buildResourceImpressionEvent(input: {
  contextId: string;
  entry: RankedContextResource;
  lat: number | null;
  lng: number | null;
  userSeed: string;
  surface?: CurationImpressionSurface;
  at?: string;
}): PredictiveCurationTelemetryEvent {
  const base = buildCurationTelemetryBase({ ...input, dwellTimeMs: 0 });
  return {
    ...base,
    ...buildSpacetimeContextFromResource(input.entry, 0),
    event_type: "RESOURCE_IMPRESSION",
    carousel_index: 0,
    surface: input.surface ?? "carousel_main",
  };
}

export function buildResourceDismissedEvent(input: {
  contextId: string;
  entry: RankedContextResource;
  lat: number | null;
  lng: number | null;
  userSeed: string;
  dwellTimeMs: number | null;
  dismissReason: "swipe_next" | "swipe_away" | "carousel_dot";
  at?: string;
}): PredictiveCurationTelemetryEvent {
  const base = buildCurationTelemetryBase({
    contextId: input.contextId,
    entry: input.entry,
    lat: input.lat,
    lng: input.lng,
    userSeed: input.userSeed,
    dwellTimeMs: input.dwellTimeMs,
    at: input.at,
  });
  return {
    ...base,
    ...buildSpacetimeContextFromResource(input.entry, 0),
    event_type: "RESOURCE_DISMISSED",
    carousel_index: 0,
    dismiss_reason: input.dismissReason,
  };
}

export function buildResourceManualPickEvent(input: {
  contextId: string;
  entry: RankedContextResource;
  lat: number | null;
  lng: number | null;
  userSeed: string;
  carouselIndex: number;
  systemRankIndex: number;
  dwellTimeMs?: number | null;
  at?: string;
}): PredictiveCurationTelemetryEvent {
  const base = buildCurationTelemetryBase({
    contextId: input.contextId,
    entry: input.entry,
    lat: input.lat,
    lng: input.lng,
    userSeed: input.userSeed,
    dwellTimeMs: input.dwellTimeMs ?? null,
    at: input.at,
  });
  return {
    ...base,
    ...buildSpacetimeContextFromResource(input.entry, input.carouselIndex),
    event_type: "RESOURCE_MANUAL_PICK",
    carousel_index: input.carouselIndex,
    system_rank_index: input.systemRankIndex,
  };
}

export function buildTransactionConvertedEvent(input: {
  contextId: string;
  resourceId: string;
  sourceHubId: string;
  lat: number | null;
  lng: number | null;
  userSeed: string;
  entry?: RankedContextResource | null;
  transactionKind?: "connect" | "purchase" | "sync";
  createdResourceId?: string | null;
  at?: string;
}): PredictiveCurationTelemetryEvent {
  const spacetime = input.entry
    ? buildSpacetimeContextFromResource(input.entry, 0)
    : {
        source_hub_id: input.sourceHubId,
        resource_kind: null,
        rank_score: null,
        carousel_index: null,
      };

  return {
    event_type: "TRANSACTION_CONVERTED",
    user_id: hashTelemetryUserId(input.userSeed),
    context_id: input.contextId,
    resource_id: input.resourceId,
    current_lat: input.lat,
    current_lng: input.lng,
    timestamp: input.at ?? new Date().toISOString(),
    dwell_time: null,
    ...spacetime,
    source_hub_id: input.sourceHubId,
    transaction_kind: input.transactionKind ?? "connect",
    created_resource_id: input.createdResourceId ?? input.resourceId,
  };
}
