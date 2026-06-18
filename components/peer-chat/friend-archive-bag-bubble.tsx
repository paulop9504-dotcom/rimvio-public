"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ArchiveMarbleStack } from "@/components/peer-chat/archive-marble-stack";
import { cn } from "@/lib/utils";
import { BUBBLE_RING_CLASS, type BubbleState } from "@/lib/social/bubble-state";
import type { SocialBubblePeer } from "@/lib/social/bubble-state";

type FriendArchiveBagBubbleProps = {
  href?: string;
  onOpen?: () => void;
  count: number;
  unreadTotal: number;
  bubbleState: BubbleState;
  previewPeers: SocialBubblePeer[];
  className?: string;
};

function BagBubbleShell({
  className,
  ariaLabel,
  onClick,
  href,
  children,
}: {
  className?: string;
  ariaLabel: string;
  onClick?: () => void;
  href?: string;
  children: ReactNode;
}) {
  const shellClass = cn(
    "flex flex-col items-center gap-1.5 active:scale-95",
    className,
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={shellClass}
        aria-label={ariaLabel}
      >
        {children}
      </button>
    );
  }

  if (href) {
    return (
      <Link href={href} className={shellClass} aria-label={ariaLabel}>
        {children}
      </Link>
    );
  }

  return (
    <div className={shellClass} aria-label={ariaLabel}>
      {children}
    </div>
  );
}

export function FriendArchiveBagBubble({
  href,
  onOpen,
  count,
  unreadTotal,
  bubbleState,
  previewPeers,
  className,
}: FriendArchiveBagBubbleProps) {
  const empty = count === 0;
  const ariaLabel = empty
    ? "구슬 주머니 · 비어 있음"
    : `나머지 친구 ${count}명 · 구슬 주머니`;

  return (
    <BagBubbleShell
      href={onOpen ? undefined : href}
      onClick={onOpen}
      className={className}
      ariaLabel={ariaLabel}
    >
      <span
        className={cn(
          "relative flex size-[4.25rem] items-center justify-center overflow-hidden rounded-full border-2 bg-gradient-to-br from-slate-700/90 via-slate-800/95 to-slate-900",
          empty ? "border-white/15 border-dashed" : BUBBLE_RING_CLASS[bubbleState],
        )}
      >
        {empty ? (
          <span className="text-sm font-medium text-white/30">비움</span>
        ) : (
          <ArchiveMarbleStack
            peers={previewPeers.slice(0, 8)}
            variant="preview"
            className="size-[3.25rem]"
          />
        )}
        {!empty ? (
          <span className="absolute -right-0.5 -top-0.5 flex min-w-[1.125rem] items-center justify-center rounded-full bg-slate-600 px-1 py-px text-[9px] font-bold tabular-nums text-white">
            {count > 99 ? "99+" : count}
          </span>
        ) : null}
        {unreadTotal > 0 ? (
          <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 rounded-full bg-amber-400 px-1.5 py-px text-[8px] font-semibold text-slate-900">
            {unreadTotal > 9 ? "9+" : unreadTotal}
          </span>
        ) : null}
      </span>
      <span className="max-w-[6rem] text-center text-[10px] font-semibold text-[#191f28]">
        {empty ? "구슬 주머니" : "나머지 친구"}
      </span>
    </BagBubbleShell>
  );
}
