/**
 * P2 prep — surface inferred (stub) pin domain after composer commit.
 */

import { findEventCandidate } from "@/lib/events/event-store";
import { getPinDomain, type PinDomainId } from "@/lib/globe/pin-domain-registry";
import {
  readPinInferredDomainId,
  readPinSlots,
} from "@/lib/globe/stamp-universal-pin-metadata";

export type InferredPinDomainStub = {
  eventId: string;
  inferredDomainId: PinDomainId;
  labelKo: string;
  phase: "stub";
  slots: Record<string, unknown>;
};

export function resolveInferredPinDomainStub(
  eventId: string | null | undefined,
): InferredPinDomainStub | null {
  const key = eventId?.trim();
  if (!key) {
    return null;
  }
  const event = findEventCandidate(key);
  if (!event) {
    return null;
  }
  const inferredDomainId = readPinInferredDomainId(event.metadata);
  if (!inferredDomainId) {
    return null;
  }
  const def = getPinDomain(inferredDomainId);
  if (def.phase !== "stub") {
    return null;
  }
  return {
    eventId: key,
    inferredDomainId,
    labelKo: def.labelKo,
    phase: "stub",
    slots: readPinSlots(event.metadata),
  };
}
