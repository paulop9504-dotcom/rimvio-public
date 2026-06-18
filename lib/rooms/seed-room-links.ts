import { funFeedLinks } from "@/lib/demo/fun-feed-links";
import {
  addLinkToRoom,
  getOrCreateDefaultRoom,
  readRoomLinks,
} from "@/lib/rooms/client";
import { DEFAULT_ROOM_SLUG } from "@/lib/rooms/types";
import type { LinkRow } from "@/types/database";

/** Diverse demo links for the default room when empty. */
const DEFAULT_ROOM_SEED_IDS = [
  "fun-google-portal",
  "fun-youtube-portal",
  "fun-rickroll",
  "fun-naver-portal",
  "fun-coupang-portal",
  "fun-netflix",
  "fun-gangnam-map",
  "fun-tving",
] as const;

let seedPromise: Promise<void> | null = null;

function cloneForRoom(link: LinkRow, roomId: string): LinkRow {
  return {
    ...link,
    id: `room-${link.id}`,
    room_id: roomId,
    link_status: "open",
    created_at: new Date().toISOString(),
  };
}

export async function ensureDefaultRoomLinksSeeded(slug: string) {
  if (slug !== DEFAULT_ROOM_SLUG) {
    return;
  }

  if (seedPromise) {
    await seedPromise;
    return;
  }

  seedPromise = (async () => {
    const room = getOrCreateDefaultRoom();
    const existing = readRoomLinks(room.id);

    if (existing.length >= 3) {
      return;
    }

    const byId = new Map(funFeedLinks.map((link) => [link.id, link]));

    for (const seedId of DEFAULT_ROOM_SEED_IDS) {
      const template = byId.get(seedId);
      if (!template) {
        continue;
      }

      const cloned = cloneForRoom(template, room.id);
      if (existing.some((item) => item.original_url === cloned.original_url)) {
        continue;
      }

      await addLinkToRoom(cloned, slug);
    }
  })();

  await seedPromise;
}
