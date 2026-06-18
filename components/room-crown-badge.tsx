"use client";

import { Crown } from "lucide-react";
import { copy } from "@/lib/copy/human-ko";
import type { RoomLeader } from "@/lib/rooms/room-leader";
import { cn } from "@/lib/utils";

export function RoomCrownBadge({
  leader,
  selfLabel,
  className,
}: {
  leader: RoomLeader | null;
  selfLabel: string;
  className?: string;
}) {
  if (!leader || leader.clears < 1) {
    return null;
  }

  const isSelf = leader.label === selfLabel;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1",
        "bg-gradient-to-r from-amber-100 via-yellow-50 to-amber-100",
        "ring-1 ring-amber-300/50 shadow-[0_2px_10px_-4px_rgba(245,158,11,0.45)]",
        className
      )}
    >
      <span
        className={cn(
          "flex size-5 items-center justify-center rounded-full",
          "bg-gradient-to-br from-amber-400 to-yellow-500 text-white",
          "shadow-sm"
        )}
      >
        <Crown className="size-3 fill-current" strokeWidth={2} />
      </span>
      <span className="text-[11px] font-semibold text-amber-950">
        {copy.room.crownLabel(leader.label, isSelf)}
      </span>
      <span className="text-[10px] tabular-nums text-amber-800/75">
        {leader.clears}
      </span>
    </div>
  );
}
