import type { EventCandidate } from "@/lib/events/event-candidate";
import { isTicketUrl } from "@/lib/resolvers/ticket-deep-links";
import type { ContextTicketArtifact } from "@/lib/globe/context-hub/context-ticket-artifact-types";
import { CONTEXT_TICKET_ARTIFACT_META_KEY } from "@/lib/globe/context-hub/context-ticket-artifact-types";

export type { ContextTicketArtifact } from "@/lib/globe/context-hub/context-ticket-artifact-types";

function readOptionalIso(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readArtifactRecord(value: unknown): ContextTicketArtifact | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const row = value as Record<string, unknown>;
  const labelKo =
    typeof row.labelKo === "string" && row.labelKo.trim()
      ? row.labelKo.trim()
      : "티켓";
  const actionUrl =
    typeof row.actionUrl === "string" && row.actionUrl.trim()
      ? row.actionUrl.trim()
      : null;
  const qrPreviewUrl =
    typeof row.qrPreviewUrl === "string" && row.qrPreviewUrl.trim()
      ? row.qrPreviewUrl.trim()
      : null;
  if (!actionUrl && !qrPreviewUrl) {
    return null;
  }
  return {
    labelKo,
    actionUrl,
    qrPreviewUrl,
    validFromIso: readOptionalIso(row.validFromIso),
    validUntilIso: readOptionalIso(row.validUntilIso),
    placeLabel: readOptionalIso(row.placeLabel),
  };
}

/** Ticket / QR artifact stored on globe context events. */
export function readContextTicketArtifact(
  event: EventCandidate,
): ContextTicketArtifact | null {
  const fromMeta = readArtifactRecord(event.metadata?.[CONTEXT_TICKET_ARTIFACT_META_KEY]);
  if (fromMeta) {
    return fromMeta;
  }

  const legacyMeta = readArtifactRecord(event.metadata?.contextTicketArtifact);
  if (legacyMeta) {
    return legacyMeta;
  }

  const ticketUrl =
    typeof event.metadata?.ticketUrl === "string"
      ? event.metadata.ticketUrl.trim()
      : "";
  if (ticketUrl && isTicketUrl(ticketUrl)) {
    return {
      labelKo: "티켓",
      actionUrl: ticketUrl,
      qrPreviewUrl: null,
    };
  }

  const shareUrl = event.description?.trim() ?? "";
  if (shareUrl && isTicketUrl(shareUrl)) {
    return {
      labelKo: "티켓",
      actionUrl: shareUrl,
      qrPreviewUrl: null,
    };
  }

  return null;
}

export function isTicketLikeContext(event: EventCandidate): boolean {
  if (readContextTicketArtifact(event)) {
    return true;
  }
  const category = event.category?.trim() ?? "";
  return category === "travel" || category === "concert" || /티켓|입장|공연|놀이/u.test(event.title);
}
