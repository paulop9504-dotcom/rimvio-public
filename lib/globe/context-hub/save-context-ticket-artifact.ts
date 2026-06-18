import type { EventCandidate } from "@/lib/events/event-candidate";
import { findEventCandidate } from "@/lib/events/event-store";
import type { ContextTicketArtifact } from "@/lib/globe/context-hub/context-ticket-artifact-types";
import { CONTEXT_TICKET_ARTIFACT_META_KEY } from "@/lib/globe/context-hub/context-ticket-artifact-types";
import { readPlanContextFromEvent } from "@/lib/plan-context/plan-context-metadata";
import { commitEventUpsert } from "@/lib/source-of-truth/commit-truth";

function normalizeArtifact(input: ContextTicketArtifact): ContextTicketArtifact {
  const labelKo = input.labelKo.trim() || "티켓";
  const actionUrl = input.actionUrl?.trim() || null;
  const qrPreviewUrl = input.qrPreviewUrl?.trim() || null;
  if (!actionUrl && !qrPreviewUrl) {
    throw new Error("ticket_qr_or_url_required");
  }
  return {
    labelKo,
    actionUrl,
    qrPreviewUrl,
    validFromIso: input.validFromIso?.trim() || null,
    validUntilIso: input.validUntilIso?.trim() || null,
    placeLabel: input.placeLabel?.trim() || null,
  };
}

/** Hub ticket plug-in — persists Resource spacetime on context EventCandidate. */
export function saveContextTicketArtifact(input: {
  contextEventId: string;
  artifact: ContextTicketArtifact;
}): EventCandidate {
  const event = findEventCandidate(input.contextEventId.trim());
  if (!event) {
    throw new Error("context_event_not_found");
  }

  const artifact = normalizeArtifact(input.artifact);
  const stamp = new Date().toISOString();

  return commitEventUpsert({
    id: event.id,
    title: event.title,
    category: event.category,
    source: event.source,
    lifecycle: event.lifecycle,
    datetime: artifact.validFromIso ?? event.datetime,
    place: artifact.placeLabel ?? event.place,
    description: event.description,
    metadata: {
      ...(event.metadata ?? {}),
      [CONTEXT_TICKET_ARTIFACT_META_KEY]: artifact,
      feedPlanEnabled: event.metadata?.feedPlanEnabled ?? true,
    },
    confidence: event.confidence,
    lifecycleUpdatedAt: stamp,
    updatedAt: stamp,
  });
}

export function buildDefaultTicketArtifactFromEvent(
  event: EventCandidate,
): Partial<ContextTicketArtifact> {
  const plan = readPlanContextFromEvent(event);
  return {
    labelKo: "티켓",
    placeLabel: plan?.place?.trim() || event.place?.trim() || event.title.trim(),
    validFromIso: event.datetime?.trim() || null,
    validUntilIso: plan?.windowEndIso?.trim() || null,
  };
}
