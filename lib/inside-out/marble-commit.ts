import type { EventCandidate, EventCandidateWire } from "@/lib/events/event-candidate";
import { commitEventWireFromApi } from "@/lib/source-of-truth/commit-truth";
import type { MarbleIngressChannel } from "@/lib/inside-out/canonical-loop";

/** Sole marble write adapter — all SENSE paths must end here. */
export function commitMarbleWire(
  patch: EventCandidateWire | null | undefined,
  input: {
    channel: MarbleIngressChannel;
    sourceMessageId?: string | null;
    sourceLine?: string | null;
    peerDisplayName?: string | null;
    peerThreadId?: string | null;
  },
): EventCandidate | null {
  if (!patch?.title?.trim()) {
    return null;
  }

  const metadata: Record<string, unknown> = {
    ...(patch.metadata ?? {}),
    channel: input.channel,
  };
  if (input.sourceLine?.trim()) {
    metadata.sourceLine = input.sourceLine.trim().slice(0, 240);
    metadata.userNote = patch.title;
  }
  if (input.peerDisplayName?.trim()) {
    metadata.peerDisplayName = input.peerDisplayName.trim();
  }
  if (input.peerThreadId?.trim()) {
    metadata.peerThreadId = input.peerThreadId.trim();
  }

  return commitEventWireFromApi(
    { ...patch, metadata },
    { sourceMessageId: input.sourceMessageId ?? null },
  );
}
