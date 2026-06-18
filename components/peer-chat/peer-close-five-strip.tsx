"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { PeerProfileAvatar } from "@/components/peer-chat/peer-profile-avatar";
import type { PinnedPeerRoster } from "@/lib/context/peer-thread-types";
import type { SocialBubblePeer } from "@/lib/social/bubble-state";
import { cn } from "@/lib/utils";

export type PeerCloseFiveStripProps = {
  roster: PinnedPeerRoster;
  peerMetaByThread?: Map<string, SocialBubblePeer>;
  onAssignSlot: (slotIndex: number) => void;
  className?: string;
};

/** Collapsed 친한 5 — quick avatar row + empty slots. */
export function PeerCloseFiveStrip({
  roster,
  peerMetaByThread,
  onAssignSlot,
  className,
}: PeerCloseFiveStripProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 overflow-x-auto px-4 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
    >
      {roster.slots.map((slot, index) => {
        if (slot.connection === "connected" && slot.peerThreadId) {
          const meta = peerMetaByThread?.get(slot.peerThreadId);
          const displayName =
            meta?.displayName?.trim() || slot.displayName?.trim() || "친구";
          const href = `/peers/${encodeURIComponent(slot.peerThreadId)}`;
          return (
            <Link
              key={`slot-${index}`}
              href={href}
              className="flex shrink-0 flex-col items-center gap-1"
              aria-label={`${displayName} · ${index + 1}번`}
            >
              <PeerProfileAvatar
                displayName={displayName}
                avatarUrl={meta?.avatarUrl}
                size="sm"
              />
              <span className="max-w-[3rem] truncate text-[9px] font-medium text-[#6b7684]">
                {displayName}
              </span>
            </Link>
          );
        }

        return (
          <button
            key={`vacant-${index}`}
            type="button"
            onClick={() => onAssignSlot(index)}
            className="flex shrink-0 flex-col items-center gap-1"
            aria-label={`${index + 1}번 자리에 친구 고정`}
          >
            <span className="flex size-10 items-center justify-center rounded-full border border-dashed border-[#d1d6db] bg-[#f2f4f6] text-[#8b95a1]">
              <Plus className="size-4" aria-hidden />
            </span>
            <span className="text-[9px] font-medium text-[#8b95a1]">
              {index + 1}번
            </span>
          </button>
        );
      })}
    </div>
  );
}
