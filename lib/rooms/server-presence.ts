import type { RoomPresencePeer } from "@/lib/rooms/types";

type PresenceEntry = RoomPresencePeer;

const TTL_MS = 25_000;
const rooms = new Map<string, Map<string, PresenceEntry>>();

function pruneRoom(slug: string) {
  const peers = rooms.get(slug);
  if (!peers) {
    return;
  }

  const now = Date.now();

  for (const [id, peer] of peers) {
    if (now - new Date(peer.last_seen).getTime() > TTL_MS) {
      peers.delete(id);
    }
  }

  if (peers.size === 0) {
    rooms.delete(slug);
  }
}

export function touchRoomPresence(
  slug: string,
  peer: Pick<RoomPresencePeer, "id" | "label" | "color">
) {
  const now = new Date().toISOString();
  const bucket = rooms.get(slug) ?? new Map<string, PresenceEntry>();

  bucket.set(peer.id, {
    ...peer,
    last_seen: now,
  });

  rooms.set(slug, bucket);
  pruneRoom(slug);

  return listRoomPresence(slug);
}

export function listRoomPresence(slug: string): RoomPresencePeer[] {
  pruneRoom(slug);

  const peers = rooms.get(slug);
  if (!peers) {
    return [];
  }

  return [...peers.values()].sort(
    (left, right) =>
      new Date(right.last_seen).getTime() - new Date(left.last_seen).getTime()
  );
}
