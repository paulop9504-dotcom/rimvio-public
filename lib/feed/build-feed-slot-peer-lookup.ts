import { readPeerContacts } from "@/lib/context/peer-contact-store";
import type { ActionChatMessage } from "@/lib/action-chat/orchestrator-types";
import type {
  FeedSlotPeerLookup,
  FeedSlotPeerLookupRow,
} from "@/lib/feed/feed-slot-peer-context-types";
import type { RelationshipFeedSlot } from "@/lib/social/relationship-slot-types";

function mergePeerRow(
  map: Map<string, FeedSlotPeerLookupRow>,
  row: FeedSlotPeerLookupRow,
): void {
  const key = row.peerThreadId.trim();
  if (!key) {
    return;
  }
  const prev = map.get(key);
  map.set(key, {
    peerThreadId: key,
    displayName: row.displayName.trim() || prev?.displayName || "친구",
    avatarUrl: row.avatarUrl ?? prev?.avatarUrl ?? null,
    rimvioId: row.rimvioId ?? prev?.rimvioId ?? null,
    emailLower: row.emailLower ?? prev?.emailLower ?? null,
  });
}

/** Pure read — index friends for slot peer resolution. */
export function buildFeedSlotPeerLookup(input: {
  messages: readonly ActionChatMessage[];
  relationshipSlots: readonly RelationshipFeedSlot[];
  contacts?: ReturnType<typeof readPeerContacts>;
  /** 단톡 ROOM — standalone /feed 에서 messageId 역추적 보강 */
  groupRooms?: readonly { peerThreadId: string; displayName: string }[];
}): FeedSlotPeerLookup {
  const map = new Map<string, FeedSlotPeerLookupRow>();

  for (const slot of input.relationshipSlots) {
    mergePeerRow(map, {
      peerThreadId: slot.roomId,
      displayName: slot.displayName,
      avatarUrl: slot.avatarUrl,
      rimvioId: slot.rimvioId,
    });
  }

  for (const room of input.groupRooms ?? []) {
    mergePeerRow(map, {
      peerThreadId: room.peerThreadId,
      displayName: room.displayName,
      avatarUrl: null,
    });
  }

  const contacts = input.contacts ?? readPeerContacts();
  for (const contact of contacts) {
    mergePeerRow(map, {
      peerThreadId: contact.peerThreadId,
      displayName: contact.displayName,
      rimvioId: contact.rimvioId ?? null,
      emailLower: contact.emailLower ?? null,
      avatarUrl: null,
    });
  }

  return {
    messages: input.messages.map((message) => ({
      id: message.id,
      feedPeerTalkThread: message.feedPeerTalkThread
        ? {
            peerThreadId: message.feedPeerTalkThread.peerThreadId,
            displayName: message.feedPeerTalkThread.displayName,
          }
        : null,
    })),
    peers: [...map.values()],
  };
}
