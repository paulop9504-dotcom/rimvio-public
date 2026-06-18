import type { EventCandidate } from "@/lib/events/event-candidate";
import { haversineKm } from "@/lib/feed/spacetime-fit";
import type {
  ContextLodgingInventoryRow,
  LodgingResourcePayload,
} from "@/lib/globe/context-hub/lodging-resource-types";
import {
  CONTEXT_LODGING_HUB_ENABLED_META_KEY,
  CONTEXT_LODGING_INVENTORY_META_KEY,
} from "@/lib/globe/context-hub/lodging-resource-types";
import { resolveContextLodgingDestinationAnchor } from "@/lib/globe/context-hub/resolve-context-lodging-search-coords";
import type { ContextResource } from "@/lib/globe/resource/types";
import { readPlanContextFromEvent } from "@/lib/plan-context/plan-context-metadata";

const LODGING_ANCHOR_TOLERANCE_KM = 30;

function readInventoryRows(value: unknown): ContextLodgingInventoryRow[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const rows: ContextLodgingInventoryRow[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const row = item as Record<string, unknown>;
    const placeId = typeof row.placeId === "string" ? row.placeId.trim() : "";
    const name = typeof row.name === "string" ? row.name.trim() : "";
    const lat = typeof row.lat === "number" && Number.isFinite(row.lat) ? row.lat : null;
    const lng = typeof row.lng === "number" && Number.isFinite(row.lng) ? row.lng : null;
    if (!placeId || !name || lat === null || lng === null) {
      continue;
    }
    const images = Array.isArray(row.images)
      ? row.images.filter((src): src is string => typeof src === "string" && src.trim().length > 0)
      : [];
    rows.push({
      placeId,
      name,
      lat,
      lng,
      images,
      videoUrl: typeof row.videoUrl === "string" ? row.videoUrl : null,
      priceKrw: typeof row.priceKrw === "number" ? row.priceKrw : null,
      partnerLabel: typeof row.partnerLabel === "string" ? row.partnerLabel : null,
      checkInIso: typeof row.checkInIso === "string" ? row.checkInIso : null,
      checkOutIso: typeof row.checkOutIso === "string" ? row.checkOutIso : null,
    });
  }
  return rows;
}

export function readLodgingPayloadFromResource(
  resource: ContextResource,
): LodgingResourcePayload | null {
  const raw = resource.metadata?.lodging;
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const row = raw as Record<string, unknown>;
  const placeId = typeof row.placeId === "string" ? row.placeId.trim() : "";
  const name = typeof row.name === "string" ? row.name.trim() : "";
  if (!placeId || !name) {
    return null;
  }
  const images = Array.isArray(row.images)
    ? row.images.filter((src): src is string => typeof src === "string" && src.trim().length > 0)
    : [];
  return {
    placeId,
    name,
    images,
    videoUrl: typeof row.videoUrl === "string" ? row.videoUrl : null,
    priceKrw: typeof row.priceKrw === "number" ? row.priceKrw : null,
    partnerLabel: typeof row.partnerLabel === "string" ? row.partnerLabel : null,
  };
}

export function isLodgingHubEnabled(event: EventCandidate): boolean {
  return event.metadata?.[CONTEXT_LODGING_HUB_ENABLED_META_KEY] === true;
}

export function readLodgingInventoryRows(
  event: EventCandidate,
): readonly ContextLodgingInventoryRow[] {
  if (!isLodgingHubEnabled(event)) {
    return [];
  }
  return readInventoryRows(event.metadata?.[CONTEXT_LODGING_INVENTORY_META_KEY]);
}

/** Stale seed from wrong anchor (e.g. mock 대전 while context is 상하이). */
export function isLodgingInventoryMisanchored(event: EventCandidate): boolean {
  const rows = readLodgingInventoryRows(event);
  if (rows.length === 0) {
    return false;
  }
  const anchor = resolveContextLodgingDestinationAnchor(event);
  return rows.some(
    (row) =>
      haversineKm(row.lat, row.lng, anchor.lat, anchor.lng) > LODGING_ANCHOR_TOLERANCE_KM,
  );
}

function formatPriceKrw(value: number | null | undefined): string | null {
  if (value == null || !Number.isFinite(value)) {
    return null;
  }
  return `${Math.round(value).toLocaleString("ko-KR")}원`;
}

export function mapLodgingRowToContextResource(
  event: EventCandidate,
  row: ContextLodgingInventoryRow,
): ContextResource {
  const plan = readPlanContextFromEvent(event);
  const payload: LodgingResourcePayload = {
    placeId: row.placeId,
    name: row.name,
    images: row.images,
    videoUrl: row.videoUrl ?? null,
    priceKrw: row.priceKrw ?? null,
    partnerLabel: row.partnerLabel ?? null,
  };

  return {
    resourceId: `${event.id}:lodging:${row.placeId}`,
    contextEventId: event.id,
    kind: "lodging_voucher",
    sourceHubId: "lodging",
    label: row.name,
    shortLabel: formatPriceKrw(row.priceKrw),
    spacetime: {
      lat: row.lat,
      lng: row.lng,
      placeLabel: row.name,
      validFromIso: row.checkInIso ?? plan?.windowStartIso ?? event.datetime ?? null,
      validUntilIso: row.checkOutIso ?? plan?.windowEndIso ?? null,
    },
    action: {
      kind: "open_url",
      href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(row.name)}&query_place_id=${encodeURIComponent(row.placeId)}`,
      labelKo: "예매",
    },
    createdAtIso: event.updatedAt ?? event.createdAt,
    updatedAtIso: event.updatedAt ?? null,
    metadata: { lodging: payload },
  };
}

/** Hub factory read — inventory rows → Resource[]. */
export function listLodgingResourcesForEvent(
  event: EventCandidate | null | undefined,
): ContextResource[] {
  if (!event) {
    return [];
  }
  return readLodgingInventoryRows(event).map((row) =>
    mapLodgingRowToContextResource(event, row),
  );
}
