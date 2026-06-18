"use client";

import Link from "next/link";
import { copy } from "@/lib/copy/human-ko";
import { RoomCrownBadge } from "@/components/room-crown-badge";
import { RoomLiveBadge } from "@/components/room-live-badge";
import { IOS } from "@/lib/ui/ios-surface";
import { isRoomMvpMode } from "@/lib/rooms/room-mode";
import type { RoomGuest } from "@/lib/rooms/guest-session";
import type { RoomLeader } from "@/lib/rooms/room-leader";
import type { RoomPresencePeer } from "@/lib/rooms/types";
import { cn } from "@/lib/utils";

type RoomFeedHeaderProps = {
  roomName: string;
  openCount: number;
  doneCount: number;
  leader: RoomLeader | null;
  guest: RoomGuest;
  live: boolean;
  peers: RoomPresencePeer[];
  onInvite: () => void;
  className?: string;
};

export function RoomFeedHeader({
  roomName,
  openCount,
  doneCount,
  leader,
  guest,
  live,
  peers,
  onInvite,
  className,
}: RoomFeedHeaderProps) {
  const showStatusRow =
    !isRoomMvpMode() &&
    ((leader && leader.clears >= 1) || live || peers.length > 0);

  return (
    <div
      className={cn(
        "shrink-0 rounded-2xl bg-rimvio-surface/90 px-3 py-2 ring-1 ring-black/[0.05] backdrop-blur-sm",
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-medium tracking-[0.08em] text-muted-foreground">
            {copy.room.linkRoomLive}
          </p>
          <h2 className="mt-0.5 truncate text-[17px] font-semibold leading-tight tracking-tight">
            {roomName}
          </h2>
          <p className="mt-0.5 text-[11px] tabular-nums text-muted-foreground">
            {copy.room.countOpen(openCount, doneCount)}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 pt-0.5">
          <Link
            href="/r"
            className={cn(
              "rounded-full px-2.5 py-1 text-[11px] font-semibold",
              IOS.secondaryBtn
            )}
          >
            목록
          </Link>
          <button
            type="button"
            onClick={onInvite}
            className="rounded-full bg-rimvio-neon-purple px-2.5 py-1 text-[11px] font-semibold text-white active:scale-[0.98]"
          >
            초대
          </button>
        </div>
      </div>

      {showStatusRow ? (
        <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-black/[0.04] pt-2">
          <RoomCrownBadge leader={leader} selfLabel={guest.label} />
          <RoomLiveBadge
            compact
            live={live}
            peers={peers}
            guest={guest}
            leaderLabel={leader?.label}
          />
        </div>
      ) : null}
    </div>
  );
}
