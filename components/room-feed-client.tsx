"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { copy } from "@/lib/copy/human-ko";
import Link from "next/link";
import { Users } from "lucide-react";
import { RoomActionSlide } from "@/components/room-action-slide";
import { RoomFeedHeader } from "@/components/room-feed-header";
import { RoomInviteSheet } from "@/components/room-invite-sheet";
import { IOS } from "@/lib/ui/ios-surface";
import { computeRoomLeader } from "@/lib/rooms/room-leader";
import { registerFriendRoomFromVisit } from "@/lib/rooms/friend-rooms";
import { useRoomLive } from "@/hooks/use-room-live";
import { getRoomBySlug } from "@/lib/rooms/client";
import { cn } from "@/lib/utils";
import { useState } from "react";
import type { LinkRow } from "@/types/database";

export function RoomFeedClient({ slug }: { slug: string }) {
  const {
    room,
    links,
    allLinks,
    doneCount,
    comments,
    presence,
    live,
    guest,
    phase,
    refresh,
    recentCommentIds,
    roomPhase,
  } = useRoomLive(slug);
  const [inviteOpen, setInviteOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const scrollToIndex = useCallback((index: number) => {
    const node = containerRef.current;
    if (!node) {
      return;
    }

    const slideHeight = node.clientHeight;
    if (slideHeight <= 0) {
      return;
    }

    node.scrollTo({
      top: Math.max(index, 0) * slideHeight,
      behavior: "smooth",
    });
  }, []);

  const leader = useMemo(() => computeRoomLeader(comments), [comments]);

  useEffect(() => {
    if (phase !== "ready" || !room) {
      return;
    }

    if (!getRoomBySlug(slug)) {
      registerFriendRoomFromVisit(room);
    }
  }, [phase, room, slug]);

  const scrollToLink = useCallback(
    (target: LinkRow) => {
      const index = links.findIndex((item) => item.id === target.id);
      if (index >= 0) {
        scrollToIndex(index);
      }
    },
    [links, scrollToIndex]
  );

  if (phase === "loading") {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        방 불러오는 중…
      </div>
    );
  }

  const knownRoom = room ?? getRoomBySlug(slug);

  if (!knownRoom) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="font-medium">방을 찾지 못했어요</p>
        <Link
          href="/r"
          className={cn("rounded-[14px] px-5 py-2.5 text-sm font-semibold", IOS.secondaryBtn)}
        >
          방 목록
        </Link>
      </div>
    );
  }

  const header = (
    <RoomFeedHeader
      className="mb-1.5"
      roomName={knownRoom.name}
      openCount={links.length}
      doneCount={doneCount}
      leader={leader}
      guest={guest}
      live={live}
      peers={presence}
      onInvite={() => setInviteOpen(true)}
    />
  );

  if (links.length === 0) {
    return (
      <>
        <div className="flex flex-1 flex-col px-1">
          {header}
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-10 text-center">
            <Users className="size-8 text-muted-foreground" />
            <p className="font-medium">{copy.room.emptyTitle}</p>
            <p className="text-sm text-muted-foreground">
              {copy.room.emptyHint}
            </p>
            <Link
              href="/"
              className="mt-2 rounded-[14px] bg-rimvio-neon-purple px-5 py-2.5 text-sm font-semibold text-white active:scale-[0.98]"
            >
              {copy.welcome.openFeed}
            </Link>
          </div>
        </div>
        <RoomInviteSheet
          room={knownRoom}
          open={inviteOpen}
          onOpenChange={setInviteOpen}
        />
      </>
    );
  }

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col gap-1">
        {header}

        <div
          ref={containerRef}
          className="min-h-0 flex-1 snap-y snap-mandatory overflow-y-auto scroll-smooth [scrollbar-width:none]"
        >
          {links.map((link, index) => (
            <RoomActionSlide
              key={link.id}
              link={link}
              roomSlug={slug}
              roomLinks={allLinks}
              comments={comments}
              openLinks={links}
              index={index}
              total={links.length}
              onRefresh={() => void refresh()}
              onScrollToIndex={scrollToIndex}
              onOpenRoomLink={scrollToLink}
              recentCommentIds={recentCommentIds}
              roomPhase={roomPhase}
            />
          ))}
        </div>
      </div>

      <RoomInviteSheet
        room={knownRoom}
        open={inviteOpen}
        onOpenChange={setInviteOpen}
      />
    </>
  );
}
