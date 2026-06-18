import type { EventCandidate } from "@/lib/events/event-candidate";
import type { ContextHubServiceRow } from "@/lib/globe/context-hub/context-hub-service-catalog";
import { extractHubRunnableAction } from "@/lib/globe/context-hub/extract-hub-runnable-action";
import { readContextTicketArtifact } from "@/lib/globe/context-hub/read-context-ticket-artifact";
import { readResourceLastSyncedAtIso } from "@/lib/globe/resource/context-resource-sync-metadata";
import type {
  ContextResource,
  ContextResourceAction,
  ContextResourceKind,
  ContextResourceSpacetime,
} from "@/lib/globe/resource/types";
import { readPlanContextFromEvent } from "@/lib/plan-context/plan-context-metadata";

function readFiniteCoord(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function mapServiceIdToKind(serviceId: ContextHubServiceRow["serviceId"]): ContextResourceKind {
  switch (serviceId) {
    case "ticket":
      return "ticket";
    case "flight":
      return "flight";
    case "lodging":
      return "lodging_voucher";
    case "rental_car":
      return "rental_car";
    case "ai_search":
      return "ai_handoff";
    default:
      return "ticket";
  }
}

function resolveResourceSpacetime(event: EventCandidate): ContextResourceSpacetime {
  const meta = event.metadata ?? {};
  const plan = readPlanContextFromEvent(event);
  const lat = readFiniteCoord(meta.globePlaceLat);
  const lng = readFiniteCoord(meta.globePlaceLng);
  return {
    validFromIso: event.datetime ?? null,
    validUntilIso: plan?.windowEndIso ?? null,
    placeLabel:
      plan?.place?.trim() || event.place?.trim() || event.title.trim() || null,
    lat,
    lng,
  };
}

function resolveTicketSpacetime(
  event: EventCandidate,
  ticketArtifact: ReturnType<typeof readContextTicketArtifact>,
): ContextResourceSpacetime {
  const base = resolveResourceSpacetime(event);
  if (!ticketArtifact) {
    return base;
  }
  return {
    ...base,
    validFromIso: ticketArtifact.validFromIso ?? base.validFromIso,
    validUntilIso: ticketArtifact.validUntilIso ?? base.validUntilIso,
    placeLabel: ticketArtifact.placeLabel ?? base.placeLabel,
  };
}

function mapRunnableToAction(
  row: ContextHubServiceRow,
  runnable: NonNullable<ReturnType<typeof extractHubRunnableAction>>,
): ContextResourceAction {
  if (row.serviceId === "ticket" && row.handoffHref && !runnable.internalRoute) {
    return {
      kind: "show_qr",
      href: runnable.href,
      labelKo: runnable.label,
    };
  }
  if (runnable.internalRoute) {
    return {
      kind: "internal_route",
      href: runnable.href,
      labelKo: runnable.label,
    };
  }
  return {
    kind: "open_url",
    href: runnable.href,
    labelKo: runnable.label,
  };
}

/** Hub factory emit — one catalog row → one Resource object. */
export function mapHubServiceRowToResource(
  event: EventCandidate,
  row: ContextHubServiceRow,
): ContextResource {
  const runnable = extractHubRunnableAction(row);
  const ticketArtifact = row.serviceId === "ticket" ? readContextTicketArtifact(event) : null;
  const label =
    row.link?.actionLabelKo ?? row.handoffLabelKo ?? row.labelKo;
  const shortLabel = row.link?.shortLabel ?? row.shortLabelKo;
  const spacetime =
    row.serviceId === "ticket"
      ? resolveTicketSpacetime(event, ticketArtifact)
      : resolveResourceSpacetime(event);
  const lastSyncedAtIso = readResourceLastSyncedAtIso(event, row.serviceId);

  return {
    resourceId: `${event.id}:${row.serviceId}`,
    contextEventId: event.id,
    kind: mapServiceIdToKind(row.serviceId),
    sourceHubId: row.serviceId,
    label,
    shortLabel,
    spacetime,
    action: runnable ? mapRunnableToAction(row, runnable) : null,
    createdAtIso: event.updatedAt ?? event.createdAt,
    updatedAtIso: event.updatedAt ?? null,
    lastSyncedAtIso,
    metadata: ticketArtifact?.qrPreviewUrl
      ? { qrPreviewUrl: ticketArtifact.qrPreviewUrl }
      : undefined,
  };
}

export type RankedContextResource = {
  resource: ContextResource;
  hubRow: ContextHubServiceRow;
  rankScore: number;
};
