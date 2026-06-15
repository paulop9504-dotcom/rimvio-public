"use client";

import type { LinkRow, LinkActionItem } from "@/types/database";
import {
  DEFAULT_ROOM_NAME,
  DEFAULT_ROOM_SLUG,
  MAX_ROOMS,
  type LinkCommentRow,
  type RoomRow,
} from "@/lib/rooms/types";
import type { RoomPhaseState } from "@/lib/rooms/room-phase";
import { createShareSlug } from "@/lib/share/share-slug";
import { registerBeamSnapshot } from "@/lib/beam/register-beam";
import {
  readLocalLinks,
  updateLocalLink,
} from "@/lib/local-links/store";

const ROOMS_KEY = "blink-rooms";
const COMMENTS_KEY = "blink-link-comments";
import { getRoomGuest, updateRoomGuest } from "@/lib/rooms/guest-session";
import {
  addFriendRoom,
  friendRoomToRow,
  getFriendRoomBySlug,
} from "@/lib/rooms/friend-rooms";
const ACTIVE_ROOM_KEY = "blink-active-room-slug";

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      return fallback;
    }

    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(key, JSON.stringify(value));
}

export function readRoomAuthorLabel() {
  return getRoomGuest().label;
}

export function setRoomAuthorLabel(label: string) {
  updateRoomGuest({ label: label.trim() || getRoomGuest().label });
}

export function readRooms(): RoomRow[] {
  const rooms = readJson<RoomRow[]>(ROOMS_KEY, []);

  if (rooms.length <= MAX_ROOMS) {
    return rooms;
  }

  const activeSlug = readActiveRoomSlug();
  const keep =
    rooms.find((room) => room.slug === activeSlug) ??
    rooms.find((room) => room.slug === DEFAULT_ROOM_SLUG) ??
    rooms[0];

  writeRooms([keep]);
  return [keep];
}

export function writeRooms(rooms: RoomRow[]) {
  writeJson(ROOMS_KEY, rooms);
}

export function readActiveRoomSlug() {
  return readJson<string | null>(ACTIVE_ROOM_KEY, null);
}

export function setActiveRoomSlug(slug: string) {
  writeJson(ACTIVE_ROOM_KEY, slug);
}

export function ensureRoomsBootstrapped() {
  if (readRooms().length === 0) {
    getOrCreateDefaultRoom();
  }
}

export function getRoomBySlug(slug: string) {
  return readRooms().find((room) => room.slug === slug) ?? null;
}

async function resolveRoomTarget(slug: string): Promise<RoomRow> {
  const local = getRoomBySlug(slug);
  if (local) {
    return local;
  }

  const friend = getFriendRoomBySlug(slug);
  if (friend) {
    return friendRoomToRow(friend);
  }

  const state = await fetchRoomState(slug);
  addFriendRoom(state.room);
  return state.room;
}

export function getPrimaryRoom(): RoomRow {
  ensureRoomsBootstrapped();
  return readRooms()[0] ?? getOrCreateDefaultRoom();
}

export function getOrCreateDefaultRoom(): RoomRow {
  const existing = getRoomBySlug(DEFAULT_ROOM_SLUG);

  if (existing) {
    return existing;
  }

  return createRoomRecord(DEFAULT_ROOM_NAME, DEFAULT_ROOM_SLUG);
}

function createRoomSlug(name: string) {
  const normalized = name
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-가-힣]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 18);

  const base = normalized || "room";
  return `${base}-${createShareSlug(4)}`;
}

function createRoomRecord(name: string, slug?: string): RoomRow {
  const rooms = readRooms();
  const room: RoomRow = {
    id: `room-${slug ?? createRoomSlug(name)}`,
    slug: slug ?? createRoomSlug(name),
    name: name.trim(),
    created_at: new Date().toISOString(),
  };

  writeRooms([room, ...rooms.filter((item) => item.slug !== room.slug)]);
  setActiveRoomSlug(room.slug);
  return room;
}

export function canCreateRoom() {
  return readRooms().length < MAX_ROOMS;
}

export function createRoom(name: string): { room?: RoomRow; error?: string } {
  const trimmed = name.trim();

  if (!trimmed) {
    return { error: "방 이름을 입력해 주세요." };
  }

  if (!canCreateRoom()) {
    return { error: "방은 1개만 만들 수 있어요." };
  }

  const room = createRoomRecord(trimmed);
  void fetch(`/api/rooms/${room.slug}`, { method: "GET" });

  return { room };
}

export function readLinkComments(): LinkCommentRow[] {
  return readJson<LinkCommentRow[]>(COMMENTS_KEY, []);
}

export function writeLinkComments(comments: LinkCommentRow[]) {
  writeJson(COMMENTS_KEY, comments);
}

export function readCommentsForLink(linkId: string) {
  return readLinkComments()
    .filter((comment) => comment.link_id === linkId)
    .sort(
      (left, right) =>
        new Date(left.created_at).getTime() - new Date(right.created_at).getTime()
    );
}

export function ensureShareSlug(link: LinkRow): LinkRow {
  if (link.share_slug) {
    return link;
  }

  const share_slug = createShareSlug();
  updateLocalLink(link.id, { share_slug });
  const next = { ...link, share_slug };
  void registerBeamSnapshot(next);
  return next;
}

export async function addLinkToRoom(link: LinkRow, roomSlug?: string) {
  ensureRoomsBootstrapped();
  const slug = roomSlug ?? readActiveRoomSlug() ?? DEFAULT_ROOM_SLUG;
  const room = getRoomBySlug(slug) ?? (await resolveRoomTarget(slug));
  const withSlug = ensureShareSlug(link);
  const nextLink: LinkRow = {
    ...withSlug,
    room_id: room.id,
    link_status: withSlug.link_status ?? "open",
  };

  setActiveRoomSlug(room.slug);

  updateLocalLink(nextLink.id, {
    room_id: room.id,
    share_slug: nextLink.share_slug,
    link_status: nextLink.link_status,
  });

  await fetch(`/api/rooms/${room.slug}/links`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ link: nextLink, roomName: room.name }),
  });

  return { room, link: nextLink };
}

/** Copy a link into another room without moving it out of the current room locally. */
export async function sendLinkToRemoteRoom(link: LinkRow, targetSlug: string) {
  const room = await resolveRoomTarget(targetSlug);
  const withSlug = ensureShareSlug(link);
  const payload: LinkRow = {
    ...withSlug,
    room_id: room.id,
    link_status: "open",
  };

  const response = await fetch(`/api/rooms/${room.slug}/links`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ link: payload, roomName: room.name }),
  });

  if (!response.ok) {
    throw new Error("링크를 보내지 못했어요. 잠시 후 다시 시도해 주세요.");
  }

  return { room, link: payload };
}

export async function addLinksToRoom(links: LinkRow[], roomSlug?: string) {
  if (!links.length) {
    throw new Error("No links to add.");
  }

  let room = getRoomBySlug(roomSlug ?? readActiveRoomSlug() ?? DEFAULT_ROOM_SLUG);

  const added: LinkRow[] = [];
  for (const link of links) {
    const result = await addLinkToRoom(link, room?.slug ?? roomSlug);
    room = result.room;
    added.push(result.link);
  }

  return { room: room!, links: added };
}

export async function markLinkDone(link: LinkRow, roomSlug: string) {
  updateLocalLink(link.id, { link_status: "done" });

  const comment: LinkCommentRow = {
    id: `comment-${crypto.randomUUID()}`,
    link_id: link.id,
    kind: "done",
    message: "미션 클리어",
    author_label: readRoomAuthorLabel(),
    created_at: new Date().toISOString(),
  };

  writeLinkComments([comment, ...readLinkComments()]);

  await fetch(`/api/rooms/${roomSlug}/status`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      linkId: link.id,
      status: "done",
      comment,
    }),
  });

  return comment;
}

export async function postActionComment(
  linkId: string,
  input: { kind: LinkCommentRow["kind"]; message: string },
  roomSlug: string
) {
  const comment: LinkCommentRow = {
    id: `comment-${crypto.randomUUID()}`,
    link_id: linkId,
    kind: input.kind,
    message: input.message,
    author_label: readRoomAuthorLabel(),
    created_at: new Date().toISOString(),
  };

  writeLinkComments([comment, ...readLinkComments()]);

  await fetch(`/api/rooms/${roomSlug}/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ comment }),
  });

  return comment;
}

export function readRoomLinks(roomId: string) {
  return readLocalLinks().filter((link) => link.room_id === roomId);
}

export function countRoomLinks(roomId: string) {
  return readRoomLinks(roomId).filter((link) => link.link_status !== "done").length;
}

function mergeRoomLinks(serverLinks: LinkRow[], room: RoomRow) {
  const byId = new Map(serverLinks.map((link) => [link.id, link]));

  for (const localLink of readRoomLinks(room.id)) {
    if (!byId.has(localLink.id)) {
      byId.set(localLink.id, localLink);
    }
  }

  return [...byId.values()].sort(
    (left, right) =>
      new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
  );
}

export async function fetchRoomState(slug: string) {
  const fallbackRoom = getRoomBySlug(slug) ?? getOrCreateDefaultRoom();

  try {
    const response = await fetch(`/api/rooms/${slug}`, { cache: "no-store" });

    if (!response.ok) {
      throw new Error("방을 불러오지 못했어요.");
    }

    const state = (await response.json()) as {
      room: RoomRow;
      links: LinkRow[];
      comments: LinkCommentRow[];
      phase?: RoomPhaseState;
    };

    return {
      ...state,
      links: mergeRoomLinks(state.links, state.room),
    };
  } catch {
    return {
      room: fallbackRoom,
      links: mergeRoomLinks([], fallbackRoom),
      comments: readLinkComments(),
      phase: null,
    };
  }
}

export async function postRoomPhasePulse(
  roomSlug: string,
  action: LinkActionItem
): Promise<RoomPhaseState | null> {
  try {
    const response = await fetch(`/api/rooms/${roomSlug}/phase`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as { phase?: RoomPhaseState };
    return payload.phase ?? null;
  } catch {
    return null;
  }
}

export { MAX_ROOMS };
