import type { EventCandidate } from "@/lib/events/event-candidate";
import type {
  FeedSlotPeerLookup,
  FeedSlotPeerLookupRow,
} from "@/lib/feed/feed-slot-peer-context-types";
import type { GlobePinPeer, GlobePinPeerSeed } from "@/lib/globe/globe-pin-peer-types";
import type { ClassifiedGlobePin } from "@/lib/feed/experience-globe-ping-types";
import { peerDisplayNamesMatch } from "@/lib/peer-chat/match-peer-display-name";
import { readPlanContextFromEvent } from "@/lib/plan-context/plan-context-metadata";

const MAX_GLOBE_PIN_PEERS = 3;

function findPeerRow(
  peers: readonly FeedSlotPeerLookupRow[],
  input: { peerThreadId?: string; displayName?: string },
): FeedSlotPeerLookupRow | null {
  if (input.peerThreadId?.trim()) {
    const byId = peers.find((row) => row.peerThreadId === input.peerThreadId?.trim());
    if (byId) {
      return byId;
    }
  }

  const label = input.displayName?.trim();
  if (label) {
    return peers.find((row) => peerDisplayNamesMatch(row.displayName, label)) ?? null;
  }

  return null;
}

/** Pure read — participant names attached to an experience event. */
export function readGlobePinPeerSeedsFromEvent(
  event: EventCandidate | null | undefined,
): GlobePinPeerSeed[] {
  if (!event) {
    return [];
  }

  const meta = event.metadata ?? {};
  const plan = readPlanContextFromEvent(event);
  const seen = new Set<string>();
  const seeds: GlobePinPeerSeed[] = [];

  const add = (displayName: string, peerThreadId?: string | null) => {
    const label = displayName.trim();
    if (!label || label === "나" || seen.has(label.toLowerCase())) {
      return;
    }
    seen.add(label.toLowerCase());
    seeds.push({
      displayName: label,
      peerThreadId: peerThreadId?.trim() || `globe-peer:${label}`,
    });
  };

  const peerNames = meta.experiencePeerNames;
  if (Array.isArray(peerNames)) {
    for (const row of peerNames) {
      if (typeof row === "string") {
        add(row);
      }
    }
  }

  add(plan?.peerDisplayName ?? "", plan?.peerThreadId);
  if (typeof meta.planPeerDisplayName === "string") {
    add(meta.planPeerDisplayName, meta.planPeerThreadId as string | undefined);
  }
  if (typeof meta.peerDisplayName === "string") {
    add(meta.peerDisplayName);
  }

  const attendees = meta.attendees;
  if (Array.isArray(attendees)) {
    for (const row of attendees) {
      if (typeof row === "string") {
        add(row);
      }
    }
  }

  const snippets = meta.experienceConversationSnippets;
  if (Array.isArray(snippets)) {
    for (const row of snippets) {
      if (
        row &&
        typeof row === "object" &&
        "speakerName" in row &&
        typeof row.speakerName === "string"
      ) {
        add(row.speakerName);
      }
    }
  }

  return seeds.slice(0, MAX_GLOBE_PIN_PEERS);
}

export function resolveGlobePinPeers(
  seeds: readonly GlobePinPeerSeed[],
  lookup?: FeedSlotPeerLookup | null,
): GlobePinPeer[] {
  const peers = lookup?.peers ?? [];
  return seeds.map((seed) => {
    const matched = findPeerRow(peers, {
      peerThreadId: seed.peerThreadId ?? undefined,
      displayName: seed.displayName,
    });
    const threadId = matched?.peerThreadId ?? seed.peerThreadId?.trim() ?? `globe-peer:${seed.displayName}`;
    return {
      peerThreadId: threadId,
      displayName: matched?.displayName?.trim() || seed.displayName,
      avatarUrl: matched?.avatarUrl ?? null,
    };
  });
}

export function projectGlobePinPeersFromEvent(
  event: EventCandidate | null | undefined,
  lookup?: FeedSlotPeerLookup | null,
): GlobePinPeer[] {
  return resolveGlobePinPeers(readGlobePinPeerSeedsFromEvent(event), lookup);
}

export function enrichClassifiedGlobePinPeers(
  pins: readonly ClassifiedGlobePin[],
  eventsById: ReadonlyMap<string, EventCandidate>,
  lookup?: FeedSlotPeerLookup | null,
): ClassifiedGlobePin[] {
  return pins.map((pin) => {
    const eventId = pin.sourceEventId?.trim();
    if (!eventId) {
      return pin;
    }
    const peers = projectGlobePinPeersFromEvent(eventsById.get(eventId), lookup);
    if (peers.length === 0) {
      return pin;
    }
    return { ...pin, peers };
  });
}
