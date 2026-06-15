"use client";

import { memo } from "react";
import {
  feedSlotPeerChipGradient,
  feedSlotPeerChipShortLabel,
} from "@/lib/feed/feed-slot-peer-chip-colors";
import type { FeedSlotPeerContext } from "@/lib/feed/feed-slot-peer-context-types";
import { cn } from "@/lib/utils";

export type FeedSlotPeerChipProps = {
  peer: FeedSlotPeerContext;
  onPress: (peer: FeedSlotPeerContext) => void;
  className?: string;
};

export const FeedSlotPeerChip = memo(function FeedSlotPeerChip({
  peer,
  onPress,
  className,
}: FeedSlotPeerChipProps) {
  const gradient = feedSlotPeerChipGradient(peer.peerThreadId);
  const shortLabel = feedSlotPeerChipShortLabel(peer.displayName);

  return (
    <button
      type="button"
      data-feed-slot-peer-chip
      data-feed-slot-peer-source={peer.source}
      aria-label={`${peer.displayName} 프로필`}
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-gradient-to-br text-[11px] font-bold leading-none text-white shadow-sm ring-1 ring-white/15 transition-transform hover:scale-[1.04] active:scale-[0.96]",
        gradient,
        className,
      )}
      onClick={(event) => {
        event.stopPropagation();
        onPress(peer);
      }}
    >
      {peer.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={peer.avatarUrl}
          alt=""
          className="size-full rounded-[9px] object-cover"
        />
      ) : (
        shortLabel
      )}
    </button>
  );
});

export type FeedSlotPeerChipStripProps = {
  peers: readonly FeedSlotPeerContext[];
  onPress: (peer: FeedSlotPeerContext) => void;
  className?: string;
};

export const FeedSlotPeerChipStrip = memo(function FeedSlotPeerChipStrip({
  peers,
  onPress,
  className,
}: FeedSlotPeerChipStripProps) {
  if (peers.length === 0) {
    return null;
  }

  return (
    <div
      className={cn("flex shrink-0 items-start gap-1 pt-0.5", className)}
      data-feed-slot-peer-strip
    >
      {peers.map((peer) => (
        <FeedSlotPeerChip key={peer.peerThreadId} peer={peer} onPress={onPress} />
      ))}
    </div>
  );
});
