import type { EventCandidate } from "@/lib/events/event-candidate";
import { findEventCandidate } from "@/lib/events/event-store";
import { getPinDomain } from "@/lib/globe/pin-domain-registry";
import type { GatheringPinSlots } from "@/lib/globe/extract-gathering-pin-slots";
import { readPinLineageParentEventId } from "@/lib/globe/pin-lineage-metadata";
import {
  readPinDomainId,
  readPinSlots,
} from "@/lib/globe/stamp-universal-pin-metadata";

export type GatheringTraceHint = {
  eventId: string;
  labelKo: string;
  slots: GatheringPinSlots;
  lineageParentEventId: string | null;
  suggestShare: boolean;
};

export function resolveGatheringTraceHint(
  eventId: string | null | undefined,
): GatheringTraceHint | null {
  const key = eventId?.trim();
  if (!key) {
    return null;
  }
  const event: EventCandidate | null = findEventCandidate(key);
  if (!event) {
    return null;
  }
  if (readPinDomainId(event.metadata) !== "gathering") {
    return null;
  }

  const rawSlots = readPinSlots(event.metadata);
  const slots: GatheringPinSlots = {
    summary: typeof rawSlots.summary === "string" ? rawSlots.summary : event.title,
    ...(typeof rawSlots.headcountHint === "number"
      ? { headcountHint: rawSlots.headcountHint }
      : {}),
    ...(typeof rawSlots.timeHint === "string" ? { timeHint: rawSlots.timeHint } : {}),
  };

  return {
    eventId: key,
    labelKo: getPinDomain("gathering").labelKo,
    slots,
    lineageParentEventId: readPinLineageParentEventId(event.metadata),
    suggestShare: event.metadata?.globeContextVisibility !== "external",
  };
}
