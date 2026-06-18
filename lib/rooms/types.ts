export const MAX_ROOMS = 1;

export type LinkCommentKind =
  | "text"
  | "done"
  | "coupon"
  | "note"
  | "price_snap"
  | "price_ok"
  | "price_high";
export type LinkCommentRow = {
  id: string;
  link_id: string;
  kind: LinkCommentKind;
  message: string;
  author_label: string;
  created_at: string;
};

export type RoomRow = {
  id: string;
  slug: string;
  name: string;
  created_at: string;
};

export type RoomServerState = {
  room: RoomRow;
  links: import("@/types/database").LinkRow[];
  comments: LinkCommentRow[];
  revision?: number;
  updated_at?: string;
  phase?: import("@/lib/rooms/room-phase").RoomPhaseState;
};

export type RoomPresencePeer = {
  id: string;
  label: string;
  color: string;
  last_seen: string;
};

export type RoomLiveEvent =
  | { kind: "comment"; comment: LinkCommentRow; linkTitle?: string }
  | { kind: "done"; linkTitle: string; authorLabel: string }
  | { kind: "link_added"; linkTitle: string };

export const DEFAULT_ROOM_SLUG = "our-room";
export const DEFAULT_ROOM_NAME = "우리 방";

export const ROOM_ACCENTS = [
  {
    emoji: "👥",
    gradient: "from-violet-500/95 to-fuchsia-600/90",
    ring: "ring-violet-400/35",
  },
  {
    emoji: "✈️",
    gradient: "from-sky-500/95 to-cyan-600/90",
    ring: "ring-sky-400/35",
  },
  {
    emoji: "🛒",
    gradient: "from-orange-500/95 to-amber-600/90",
    ring: "ring-orange-400/35",
  },
  {
    emoji: "🎬",
    gradient: "from-rose-500/95 to-red-600/90",
    ring: "ring-rose-400/35",
  },
] as const;

export function roomAccentForIndex(index: number) {
  return ROOM_ACCENTS[index % ROOM_ACCENTS.length];
}

export function roomAccentForRoom(room: RoomRow, rooms: RoomRow[]) {
  const index = rooms.findIndex((item) => item.id === room.id);
  return roomAccentForIndex(index >= 0 ? index : 0);
}
