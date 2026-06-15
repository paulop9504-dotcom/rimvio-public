"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { diffRoomActivity, roomLiveToast } from "@/lib/rooms/diff-room-activity";
import { getRoomGuest, ROOM_GUEST_UPDATED } from "@/lib/rooms/guest-session";
import { fetchRoomState } from "@/lib/rooms/client";
import { ensureDefaultRoomLinksSeeded } from "@/lib/rooms/seed-room-links";
import { isRoomMvpMode } from "@/lib/rooms/room-mode";
import type { LinkCommentRow, LinkRow, RoomRow } from "@/types/database";
import type { RoomPresencePeer, RoomServerState } from "@/lib/rooms/types";
import type { RoomPhaseState } from "@/lib/rooms/room-phase";

type UseRoomLiveResult = {
  room: RoomRow | null;
  links: LinkRow[];
  allLinks: LinkRow[];
  doneCount: number;
  comments: LinkCommentRow[];
  presence: RoomPresencePeer[];
  live: boolean;
  guest: ReturnType<typeof getRoomGuest>;
  phase: "loading" | "ready";
  roomPhase: RoomPhaseState | null;
  refresh: () => Promise<void>;
  recentCommentIds: Set<string>;
};

function splitLinks(links: LinkRow[]) {
  const open = links.filter((link) => link.link_status !== "done");
  const doneCount = links.filter((link) => link.link_status === "done").length;
  return { open, doneCount };
}

export function useRoomLive(slug: string): UseRoomLiveResult {
  const [selfGuest, setSelfGuest] = useState(() => getRoomGuest());

  useEffect(() => {
    const sync = () => setSelfGuest(getRoomGuest());
    window.addEventListener(ROOM_GUEST_UPDATED, sync);
    return () => window.removeEventListener(ROOM_GUEST_UPDATED, sync);
  }, []);
  const snapshotRef = useRef<RoomServerState | null>(null);
  const seenCommentIdsRef = useRef<Set<string>>(new Set());
  const [recentCommentIds, setRecentCommentIds] = useState<Set<string>>(new Set());

  const [room, setRoom] = useState<RoomRow | null>(null);
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [allLinks, setAllLinks] = useState<LinkRow[]>([]);
  const [doneCount, setDoneCount] = useState(0);
  const [comments, setComments] = useState<LinkCommentRow[]>([]);
  const [presence, setPresence] = useState<RoomPresencePeer[]>([]);
  const [live, setLive] = useState(false);
  const [phase, setPhase] = useState<"loading" | "ready">("loading");
  const [roomPhase, setRoomPhase] = useState<RoomPhaseState | null>(null);

  const applySnapshot = useCallback(
    (next: RoomServerState, notify = true) => {
      const events = notify
        ? diffRoomActivity(snapshotRef.current, next, selfGuest.label)
        : [];

      for (const event of events) {
        const copy = roomLiveToast(event);
        toast(copy.title, { description: copy.description });
      }

      if (events.some((event) => event.kind === "comment")) {
        const freshIds = new Set(
          events
            .filter((event) => event.kind === "comment")
            .map((event) => event.comment.id)
        );
        setRecentCommentIds(freshIds);
        window.setTimeout(() => setRecentCommentIds(new Set()), 2400);
      }

      for (const comment of next.comments) {
        seenCommentIdsRef.current.add(comment.id);
      }

      snapshotRef.current = next;
      const split = splitLinks(next.links);
      setRoom(next.room);
      setAllLinks(next.links);
      setLinks(split.open);
      setDoneCount(split.doneCount);
      setComments(next.comments);
      setRoomPhase(next.phase ?? null);
      setPhase("ready");
    },
    [selfGuest.label]
  );

  const refresh = useCallback(async () => {
    await ensureDefaultRoomLinksSeeded(slug);
    const next = await fetchRoomState(slug);
    applySnapshot(
      {
        room: next.room,
        links: next.links,
        comments: next.comments,
      },
      Boolean(snapshotRef.current)
    );
  }, [applySnapshot, slug]);

  const pingPresence = useCallback(async () => {
    try {
      const response = await fetch(`/api/rooms/${slug}/live`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(selfGuest),
      });

      if (response.ok) {
        const payload = (await response.json()) as { peers?: RoomPresencePeer[] };
        if (payload.peers) {
          setPresence(payload.peers);
        }
      }
    } catch {
      // ignore transient presence errors
    }
  }, [selfGuest, slug]);

  useEffect(() => {
    let cancelled = false;

    const boot = async () => {
      await ensureDefaultRoomLinksSeeded(slug);
      const next = await fetchRoomState(slug);
      if (cancelled) {
        return;
      }

      applySnapshot(
        {
          room: next.room,
          links: next.links,
          comments: next.comments,
        },
        false
      );
      if (!isRoomMvpMode()) {
        void pingPresence();
      }
    };

    void boot();

    return () => {
      cancelled = true;
    };
  }, [applySnapshot, pingPresence, slug]);

  useEffect(() => {
    if (isRoomMvpMode()) {
      const interval = window.setInterval(() => void refresh(), 30_000);
      return () => window.clearInterval(interval);
    }

    return undefined;
  }, [refresh]);

  useEffect(() => {
    if (isRoomMvpMode()) {
      return;
    }

    const source = new EventSource(`/api/rooms/${slug}/live`);

    source.onopen = () => setLive(true);
    source.onerror = () => setLive(false);

    source.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as {
          type?: string;
          revision?: number;
          peers?: RoomPresencePeer[];
        };

        if (payload.peers) {
          setPresence(payload.peers);
        }

        if (payload.type === "sync") {
          void refresh();
        }
      } catch {
        // ignore malformed events
      }
    };

    return () => {
      source.close();
      setLive(false);
    };
  }, [refresh, slug]);

  useEffect(() => {
    if (isRoomMvpMode()) {
      return;
    }

    void pingPresence();
    const interval = window.setInterval(() => void pingPresence(), 12_000);
    return () => window.clearInterval(interval);
  }, [pingPresence]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void refresh();
        void pingPresence();
      }
    };

    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [pingPresence, refresh]);

  return {
    room,
    links,
    allLinks,
    doneCount,
    comments,
    presence,
    live,
    guest: selfGuest,
    phase,
    roomPhase,
    refresh,
    recentCommentIds,
  };
}
