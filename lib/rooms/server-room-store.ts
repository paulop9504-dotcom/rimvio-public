import fs from "node:fs";
import path from "node:path";
import type { LinkRow } from "@/types/database";
import type { LinkCommentRow, RoomRow, RoomServerState } from "@/lib/rooms/types";
import {
  createEmptyRoomPhase,
  recordRoomPhasePulse,
  type RoomPhaseState,
} from "@/lib/rooms/room-phase";
import type { LinkActionItem } from "@/types/database";
import {
  DEFAULT_ROOM_NAME,
  DEFAULT_ROOM_SLUG,
} from "@/lib/rooms/types";

const ROOM_DIR = path.join(process.cwd(), ".data", "rooms");

function ensureDir() {
  fs.mkdirSync(ROOM_DIR, { recursive: true });
}

function roomPath(slug: string) {
  return path.join(ROOM_DIR, `${slug}.json`);
}

function defaultRoom(): RoomRow {
  return {
    id: `room-${DEFAULT_ROOM_SLUG}`,
    slug: DEFAULT_ROOM_SLUG,
    name: DEFAULT_ROOM_NAME,
    created_at: new Date().toISOString(),
  };
}

export function readRoomState(slug: string): RoomServerState | null {
  try {
    const raw = fs.readFileSync(roomPath(slug), "utf8");
    return normalizeRoomState(JSON.parse(raw) as RoomServerState);
  } catch {
    return null;
  }
}

export function getOrCreateRoomState(slug: string, name?: string): RoomServerState {
  const existing = readRoomState(slug);
  if (existing) {
    return normalizeRoomState(existing);
  }

  return normalizeRoomState({
    room: {
      ...defaultRoom(),
      slug,
      name: name ?? DEFAULT_ROOM_NAME,
    },
    links: [],
    comments: [],
    revision: 0,
    updated_at: new Date().toISOString(),
  });
}

function normalizeRoomState(state: RoomServerState): RoomServerState {
  return {
    ...state,
    revision: state.revision ?? 0,
    updated_at: state.updated_at ?? new Date().toISOString(),
    phase: state.phase ?? createEmptyRoomPhase(),
  };
}

function writeRoomState(state: RoomServerState) {
  ensureDir();
  const next = normalizeRoomState({
    ...state,
    revision: (state.revision ?? 0) + 1,
    updated_at: new Date().toISOString(),
  });

  fs.writeFileSync(
    roomPath(next.room.slug),
    `${JSON.stringify(next, null, 2)}\n`,
    "utf8"
  );

  return next;
}

export function readRoomRevision(slug: string) {
  return normalizeRoomState(getOrCreateRoomState(slug)).revision ?? 0;
}

export function upsertRoomLink(slug: string, link: LinkRow, roomName?: string) {
  const state = getOrCreateRoomState(slug, roomName);
  const index = state.links.findIndex((item) => item.id === link.id);
  const nextLink = { ...link, room_id: state.room.id };

  if (index >= 0) {
    state.links[index] = nextLink;
  } else {
    state.links.unshift(nextLink);
  }

  writeRoomState(state);
  return state;
}

export function updateRoomLinkStatus(
  slug: string,
  linkId: string,
  status: LinkRow["link_status"]
) {
  const state = getOrCreateRoomState(slug);
  const link = state.links.find((item) => item.id === linkId);

  if (!link) {
    return null;
  }

  link.link_status = status;
  writeRoomState(state);
  return link;
}

export function addRoomComment(slug: string, comment: LinkCommentRow) {
  const state = getOrCreateRoomState(slug);
  state.comments.unshift(comment);
  writeRoomState(state);
  return comment;
}

export function recordRoomPhaseAction(
  slug: string,
  action: LinkActionItem
): RoomPhaseState {
  const state = getOrCreateRoomState(slug);
  state.phase = recordRoomPhasePulse(state.phase, action);
  writeRoomState(state);
  return state.phase;
}
