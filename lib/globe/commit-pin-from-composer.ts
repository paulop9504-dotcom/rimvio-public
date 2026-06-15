/**
 * Unified composer commit — text classify → truth stamp → capture attach.
 * @see docs/RFC_UNIVERSAL_PIN_SYSTEM.md
 */

import type { EventCandidate } from "@/lib/events/event-candidate";
import { classifyPinDomainFromText } from "@/lib/globe/classify-pin-domain";
import type { PinDomainClassification } from "@/lib/globe/classify-pin-domain";
import { stampUniversalPinMetadata } from "@/lib/globe/stamp-universal-pin-metadata";
import { commitEventUpsert } from "@/lib/source-of-truth/commit-truth";

export type ComposerPinPreview = PinDomainClassification & {
  activeDomainId: PinDomainClassification["domainId"];
};

/** Inspect composer input without writing — for future confirm UI. */
export function previewPinFromComposerText(text: string): ComposerPinPreview {
  const classification = classifyPinDomainFromText(text);
  return {
    ...classification,
    activeDomainId: classification.domainId,
  };
}

/** Stamp universal pin metadata onto an event before or after upsert. */
export function applyUniversalPinToEventDraft(
  event: EventCandidate,
  sourceText?: string | null,
  lineageParentEventId?: string | null,
): EventCandidate {
  const metadata = stampUniversalPinMetadata({
    metadata: event.metadata,
    sourceText,
    lineageParentEventId,
  });
  if (metadata === event.metadata) {
    return event;
  }
  return { ...event, metadata };
}

/** Persist pin metadata on an existing committed event. */
export function commitUniversalPinMetadata(input: {
  event: EventCandidate;
  sourceText?: string | null;
}): EventCandidate {
  const metadata = stampUniversalPinMetadata({
    metadata: input.event.metadata,
    sourceText: input.sourceText,
  });
  return commitEventUpsert({
    id: input.event.id,
    title: input.event.title,
    category: input.event.category,
    source: input.event.source,
    lifecycle: input.event.lifecycle,
    datetime: input.event.datetime,
    place: input.event.place,
    containerId: input.event.containerId,
    confidence: input.event.confidence,
    metadata,
    lifecycleUpdatedAt: input.event.lifecycleUpdatedAt,
  });
}

/** Prepare metadata merge for new spacetime event before first capture commit. */
export function stampComposerTargetEvent(
  event: EventCandidate,
  sourceText: string,
  createdNewEvent: boolean,
  lineageParentEventId?: string | null,
): EventCandidate {
  if (!createdNewEvent && event.metadata?.pinDomainId && !lineageParentEventId) {
    return event;
  }
  return applyUniversalPinToEventDraft(event, sourceText, lineageParentEventId);
}
