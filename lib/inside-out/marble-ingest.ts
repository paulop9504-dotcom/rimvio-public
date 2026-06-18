import type { EventCandidate, EventCandidateWire } from "@/lib/events/event-candidate";
import { detectAndEmitEventCandidate } from "@/lib/events/emit-event-candidate";
import type { MarbleIngressChannel } from "@/lib/inside-out/canonical-loop";
import { commitMarbleWire } from "@/lib/inside-out/marble-commit";
import { formatDateKey } from "@/lib/schedule/day-schedule";

export type { MarbleIngressChannel };

/** Orchestrator / OCR / hydrate — wire already materialized. */
export function ingestMarbleWire(
  wire: EventCandidateWire | null | undefined,
  input: {
    channel: MarbleIngressChannel;
    sourceMessageId?: string | null;
    sourceLine?: string | null;
    peerDisplayName?: string | null;
    peerThreadId?: string | null;
  },
): EventCandidate | null {
  return commitMarbleWire(wire, input);
}

export type IngestConversationMarbleInput = {
  body: string;
  channel: Extract<MarbleIngressChannel, "peer_talk" | "feed_chat">;
  /** Thread / container for dedupe and social island bias later. */
  containerId?: string | null;
  messageId?: string | null;
  peerDisplayName?: string | null;
  referenceDate?: string;
};

/**
 * IO "marble" — conversation line → Event SSOT (write path).
 * Read paths must use `readLifeProjections` only.
 */
export function ingestConversationMarble(
  input: IngestConversationMarbleInput,
): EventCandidate | null {
  const body = input.body.trim();
  if (!body) {
    return null;
  }

  const wire = detectAndEmitEventCandidate({
    message: body,
    referenceDate: input.referenceDate ?? formatDateKey(),
    containerId: input.containerId ?? undefined,
  });

  if (!wire) {
    return null;
  }

  return commitMarbleWire(wire, {
    channel: input.channel,
    sourceMessageId: input.messageId ?? null,
    sourceLine: body,
    peerDisplayName: input.peerDisplayName,
    peerThreadId: input.containerId,
  });
}

/** Peer talk send path — P0-1. */
export function ingestPeerTalkMarble(input: {
  body: string;
  peerThreadId: string;
  messageId: string;
  displayName?: string;
}): EventCandidate | null {
  return ingestConversationMarble({
    body: input.body,
    channel: "peer_talk",
    containerId: input.peerThreadId,
    messageId: input.messageId,
    peerDisplayName: input.displayName,
  });
}
