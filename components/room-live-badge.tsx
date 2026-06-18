"use client";

import { Crown } from "lucide-react";
import { RimvioAvatarMark } from "@/lib/brand/rimvio-smiley-mark";
import type { RimvioAvatarVariantId } from "@/lib/brand/rimvio-avatar-colors";
import type { RoomGuest } from "@/lib/rooms/guest-session";
import type { RoomPresencePeer } from "@/lib/rooms/types";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";

type RoomLiveBadgeProps = {
  live: boolean;
  peers: RoomPresencePeer[];
  guest: RoomGuest;
  leaderLabel?: string | null;
  compact?: boolean;
};

function RimvioAvatarChip({
  variant,
  isLeader,
  title,
}: {
  variant: RimvioAvatarVariantId | null;
  isLeader?: boolean;
  title: string;
}) {
  return (
    <span className="relative inline-flex" title={title}>
      {isLeader ? (
        <span
          className={cn(
            "absolute -right-0.5 -top-2 z-10 flex size-4 items-center justify-center",
            "rounded-full bg-gradient-to-br from-amber-400 to-yellow-500",
            "text-white shadow-sm ring-1 ring-white"
          )}
          aria-hidden
        >
          <Crown className="size-2.5 fill-current" strokeWidth={2.5} />
        </span>
      ) : null}
      <span
        className={cn(
          "flex size-7 items-center justify-center overflow-hidden rounded-full bg-rimvio-surface ring-2 ring-background",
          isLeader && "ring-amber-300/80"
        )}
      >
        <RimvioAvatarMark variant={variant ?? undefined} pixels={26} crisp />
      </span>
    </span>
  );
}

function LetterAvatarChip({
  label,
  color,
  isLeader,
  title,
}: {
  label: string;
  color: string;
  isLeader?: boolean;
  title: string;
}) {
  return (
    <span className="relative inline-flex" title={title}>
      {isLeader ? (
        <span
          className={cn(
            "absolute -right-0.5 -top-2 z-10 flex size-4 items-center justify-center",
            "rounded-full bg-gradient-to-br from-amber-400 to-yellow-500",
            "text-white shadow-sm ring-1 ring-white"
          )}
          aria-hidden
        >
          <Crown className="size-2.5 fill-current" strokeWidth={2.5} />
        </span>
      ) : null}
      <span
        className={cn(
          "flex size-6 items-center justify-center rounded-full text-[9px] font-bold text-white ring-2 ring-background",
          isLeader && "ring-amber-300/80"
        )}
        style={{ backgroundColor: color }}
      >
        {label.slice(0, 1)}
      </span>
    </span>
  );
}

export function RoomLiveBadge({
  live,
  peers,
  guest,
  leaderLabel,
  compact = false,
}: RoomLiveBadgeProps) {
  const others = peers.filter((peer) => peer.id !== guest.id);
  const selfIsLeader = Boolean(leaderLabel && leaderLabel === guest.label);

  return (
    <div className={cn("flex flex-wrap items-center", compact ? "gap-1.5" : "gap-2")}>
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
          live
            ? "bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/20"
            : "bg-muted/60 text-muted-foreground"
        )}
      >
        <span
          className={cn(
            "size-1.5 rounded-full",
            live ? "animate-pulse bg-emerald-500" : "bg-muted-foreground/70"
          )}
        />
        {live ? copy.room.live : copy.room.connecting}
      </span>

      <div className="flex items-center -space-x-1">
        <RimvioAvatarChip
          variant={guest.avatarVariant}
          isLeader={selfIsLeader}
          title={`${guest.label} (나)`}
        />
        {others.slice(0, 3).map((peer) => (
          <LetterAvatarChip
            key={peer.id}
            label={peer.label}
            color={peer.color}
            isLeader={leaderLabel === peer.label}
            title={peer.label}
          />
        ))}
        {others.length > 3 ? (
          <span className="flex size-6 items-center justify-center rounded-full bg-muted text-[9px] font-semibold text-muted-foreground ring-2 ring-background">
            +{others.length - 3}
          </span>
        ) : null}
      </div>
    </div>
  );
}
