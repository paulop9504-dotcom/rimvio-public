"use client";

import { PeerProfileAvatar } from "@/components/peer-chat/peer-profile-avatar";
import type { ContextMediaReelItem } from "@/lib/globe/project-context-media-reel";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";

export type BridgeParticipantRow = {
  userId: string;
  displayName: string;
  avatarUrl?: string | null;
  role?: "host" | "participant";
  status?: string;
};

function participantsFromReel(
  items: readonly ContextMediaReelItem[],
): BridgeParticipantRow[] {
  const byId = new Map<string, BridgeParticipantRow>();
  for (const item of items) {
    const userId = item.ownerUserId?.trim() || item.authorDisplayName?.trim();
    if (!userId) {
      continue;
    }
    if (byId.has(userId)) {
      continue;
    }
    byId.set(userId, {
      userId,
      displayName: item.authorDisplayName?.trim() || "친구",
      avatarUrl: item.authorAvatarUrl ?? null,
    });
  }
  return [...byId.values()];
}

export type ExperienceBridgeParticipantsStripProps = {
  items: readonly ContextMediaReelItem[];
  participants?: readonly BridgeParticipantRow[];
  className?: string;
};

/** Face pile — who is in this shared experience. */
export function ExperienceBridgeParticipantsStrip({
  items,
  participants = [],
  className,
}: ExperienceBridgeParticipantsStripProps) {
  const fromReel = participantsFromReel(items);
  const merged = participants.length > 0 ? participants : fromReel;
  const visible = merged.slice(0, 5);
  const overflow = merged.length - visible.length;

  if (visible.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-2xl border border-white/10 bg-gradient-to-r from-white/10 via-white/5 to-transparent px-3.5 py-2.5 backdrop-blur-xl",
        className,
      )}
      data-experience-bridge-participants
    >
      <div className="flex -space-x-2.5">
        {visible.map((row) => (
          <PeerProfileAvatar
            key={row.userId}
            displayName={row.displayName}
            avatarUrl={row.avatarUrl}
            size="sm"
            className="size-9 ring-2 ring-black/40"
          />
        ))}
        {overflow > 0 ? (
          <span className="flex size-9 items-center justify-center rounded-full bg-black/50 text-[11px] font-bold text-white ring-2 ring-black/40">
            +{overflow}
          </span>
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-white/55">
          {copy.globe.bridgeMediaEyebrow}
        </p>
        <p className="truncate text-[13px] font-semibold text-white">
          {copy.globe.bridgeParticipantsLine(visible.map((row) => row.displayName))}
        </p>
      </div>
    </div>
  );
}
