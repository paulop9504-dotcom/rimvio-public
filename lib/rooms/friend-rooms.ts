"use client";

import type { RoomRow } from "@/lib/rooms/types";

export type FriendRoomRow = {
  slug: string;
  name: string;
  added_at: string;
};

export const MAX_FRIEND_ROOMS = 8;
const FRIEND_ROOMS_KEY = "blink-friend-rooms";

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

export function readFriendRooms(): FriendRoomRow[] {
  return readJson<FriendRoomRow[]>(FRIEND_ROOMS_KEY, []);
}

function writeFriendRooms(rooms: FriendRoomRow[]) {
  writeJson(FRIEND_ROOMS_KEY, rooms.slice(0, MAX_FRIEND_ROOMS));
}

export function getFriendRoomBySlug(slug: string) {
  return readFriendRooms().find((room) => room.slug === slug) ?? null;
}

export function addFriendRoom(room: Pick<RoomRow, "slug" | "name">): FriendRoomRow {
  const existing = getFriendRoomBySlug(room.slug);

  if (existing) {
    if (existing.name !== room.name.trim()) {
      const next = readFriendRooms().map((item) =>
        item.slug === room.slug
          ? { ...item, name: room.name.trim() || item.name }
          : item
      );
      writeFriendRooms(next);
      return next.find((item) => item.slug === room.slug)!;
    }

    return existing;
  }

  const entry: FriendRoomRow = {
    slug: room.slug,
    name: room.name.trim() || room.slug,
    added_at: new Date().toISOString(),
  };

  writeFriendRooms([entry, ...readFriendRooms()]);
  return entry;
}

export function removeFriendRoom(slug: string) {
  writeFriendRooms(readFriendRooms().filter((room) => room.slug !== slug));
}

export function registerFriendRoomFromVisit(room: RoomRow) {
  return addFriendRoom(room);
}

export function parseRoomSlug(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.includes("://") || trimmed.startsWith("/")) {
    try {
      const url = new URL(trimmed, "http://local");
      const match = url.pathname.match(/^\/r\/([^/]+)\/?$/i);
      if (match?.[1]) {
        return decodeURIComponent(match[1]);
      }
    } catch {
      return null;
    }
  }

  if (/^[a-z0-9가-힣_-]+$/i.test(trimmed)) {
    return trimmed;
  }

  return null;
}

export function friendRoomToRow(friend: FriendRoomRow): RoomRow {
  return {
    id: `friend-${friend.slug}`,
    slug: friend.slug,
    name: friend.name,
    created_at: friend.added_at,
  };
}
