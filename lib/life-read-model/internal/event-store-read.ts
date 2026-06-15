/**
 * Sole direct reader of `event-store` inside the life read model.
 * @internal — not exported from `@/lib/life-read-model`.
 */
import type { EventCandidate, EventCandidateLifecycle } from "@/lib/events/event-candidate";
import {
  findEventCandidate as storeFindEventCandidate,
  findEventCandidateByLinkId as storeFindByLinkId,
  findEventCandidateByMessageId as storeFindByMessageId,
  findEventBySourceMessage as storeFindBySourceMessage,
  findLatestOpenEvent as storeFindLatestOpen,
  listEventCandidates as storeListEventCandidates,
  listEventCandidatesByLifecycle as storeListByLifecycle,
} from "@/lib/events/event-store";

export function listLifeEventCandidates(): EventCandidate[] {
  return storeListEventCandidates();
}

export function listLifeEventCandidatesByLifecycle(
  lifecycle: EventCandidateLifecycle,
): EventCandidate[] {
  return storeListByLifecycle(lifecycle);
}

export function findLifeEventCandidate(id: string): EventCandidate | null {
  return storeFindEventCandidate(id);
}

export function findLifeEventBySourceMessage(sourceMessage: string): EventCandidate | null {
  return storeFindBySourceMessage(sourceMessage);
}

export function findLifeEventCandidateByMessageId(messageId: string): EventCandidate | null {
  return storeFindByMessageId(messageId);
}

export function findLifeEventCandidateByLinkId(linkId: string): EventCandidate | null {
  return storeFindByLinkId(linkId);
}

export function findLatestOpenLifeEvent(): EventCandidate | null {
  return storeFindLatestOpen();
}
