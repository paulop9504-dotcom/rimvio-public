import { isChatScheduledEvent } from "@/lib/events/chat-scheduled-ingest";
import type { EventCandidate } from "@/lib/events/event-candidate";
import type { FeedSlotOpenTarget } from "@/lib/feed/feed-slot-open-target-types";
import type { FeedSlotPeerLookup } from "@/lib/feed/feed-slot-peer-context-types";
import {
  resolveFeedSlotPeerContext,
  resolveFeedSlotPeerContexts,
} from "@/lib/feed/resolve-feed-slot-peer-context";
import type { FeedTodaySlot } from "@/lib/feed/feed-today-slot-types";
import { readPlanContextFromEvent } from "@/lib/plan-context/plan-context-metadata";
import { isPeerThreadId } from "@/lib/peer-chat/group-thread";

function readPeerThreadIdFromMetadata(
  metadata: Record<string, unknown> | undefined,
): string | null {
  const raw = metadata?.peerThreadId;
  if (typeof raw !== "string") {
    return null;
  }
  const trimmed = raw.trim();
  return trimmed && isPeerThreadId(trimmed) ? trimmed : null;
}

function readMessageIdFromMetadata(
  metadata: Record<string, unknown> | undefined,
): string | null {
  const raw = metadata?.messageId ?? metadata?.sourceMessageId;
  if (typeof raw !== "string") {
    return null;
  }
  const trimmed = raw.trim();
  return trimmed || null;
}

/** Pure read — card tap → peer ROOM, feed message, or calendar sheet. */
export function resolveFeedSlotOpenTarget(
  slot: FeedTodaySlot,
  lookup: FeedSlotPeerLookup,
  eventsById?: ReadonlyMap<string, EventCandidate>,
): FeedSlotOpenTarget {
  if (slot.kind !== "calendar") {
    return { kind: "calendar" };
  }

  const eventId = slot.row.event.eventId?.trim();
  const event = eventId ? eventsById?.get(eventId) : undefined;

  const metadataPeerThreadId = readPeerThreadIdFromMetadata(event?.metadata);
  if (metadataPeerThreadId) {
    return {
      kind: "peer_room",
      peerThreadId: metadataPeerThreadId,
      displayName:
        typeof event?.metadata?.peerDisplayName === "string"
          ? event.metadata.peerDisplayName
          : undefined,
    };
  }

  const plan = event ? readPlanContextFromEvent(event) : null;
  const planPeerThreadId = plan?.peerThreadId?.trim();
  if (planPeerThreadId && isPeerThreadId(planPeerThreadId)) {
    return {
      kind: "peer_room",
      peerThreadId: planPeerThreadId,
      displayName: plan.peerDisplayName ?? undefined,
    };
  }
  const talkPeer = resolveFeedSlotPeerContext(slot, lookup, plan);
  if (talkPeer?.source === "feed_talk") {
    return {
      kind: "peer_room",
      peerThreadId: talkPeer.peerThreadId,
      displayName: talkPeer.displayName,
    };
  }

  const peers = resolveFeedSlotPeerContexts(slot, lookup, plan);
  if (peers.length === 1) {
    return {
      kind: "peer_room",
      peerThreadId: peers[0]!.peerThreadId,
      displayName: peers[0]!.displayName,
    };
  }

  const messageId =
    readMessageIdFromMetadata(event?.metadata) ??
    slot.row.event.entry?.messageId?.trim() ??
    null;

  if (messageId && event && isChatScheduledEvent(event)) {
    return { kind: "feed_message", messageId };
  }

  if (messageId && lookup.messages.some((row) => row.id === messageId)) {
    return { kind: "feed_message", messageId };
  }

  return { kind: "calendar" };
}
