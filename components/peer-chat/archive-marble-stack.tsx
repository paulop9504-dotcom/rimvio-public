"use client";

import Link from "next/link";
import { BUBBLE_RING_CLASS } from "@/lib/social/bubble-state";
import type { SocialBubblePeer } from "@/lib/social/bubble-state";
import { marbleStackPlacement } from "@/lib/social/archive-marble-layout";
import { cn } from "@/lib/utils";

type ArchiveMarbleStackProps = {
  peers: SocialBubblePeer[];
  className?: string;
  /** Hub bag preview — smaller marbles */
  variant?: "room" | "preview";
};

function MarbleBubble({
  peer,
  placement,
  variant,
}: {
  peer: SocialBubblePeer;
  placement: ReturnType<typeof marbleStackPlacement>;
  variant: "room" | "preview";
}) {
  const href = `/peers/${encodeURIComponent(peer.threadId)}`;
  const sizeClass =
    variant === "preview"
      ? "size-7 border"
      : "size-[3.25rem] border-2";

  return (
    <Link
      href={href}
      className="absolute active:scale-95"
      style={{
        left: `${placement.leftPct}%`,
        top: `${placement.topPct}%`,
        zIndex: placement.zIndex,
        transform: `translate(-50%, -50%) scale(${placement.scale})`,
      }}
      aria-label={peer.displayName}
    >
      <span
        className={cn(
          "flex items-center justify-center overflow-hidden rounded-full bg-rimvio-surface font-semibold text-white shadow-md",
          sizeClass,
          BUBBLE_RING_CLASS[peer.bubbleState],
        )}
      >
        {variant === "preview" ? (
          <span className="text-[10px]">
            {peer.displayName.trim().charAt(0) || "·"}
          </span>
        ) : peer.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={peer.avatarUrl}
            alt=""
            className="size-full object-cover"
          />
        ) : (
          <span className="text-base">
            {peer.displayName.trim().charAt(0) || "?"}
          </span>
        )}
      </span>
      {variant === "room" && peer.unreadCount > 0 ? (
        <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-amber-400 text-[9px] font-bold text-slate-900">
          {peer.unreadCount > 9 ? "9+" : peer.unreadCount}
        </span>
      ) : null}
    </Link>
  );
}

export function ArchiveMarbleStack({
  peers,
  className,
  variant = "room",
}: ArchiveMarbleStackProps) {
  if (peers.length === 0) {
    if (variant === "preview") {
      return null;
    }
    return (
      <div
        className={cn(
          "flex flex-1 flex-col items-center justify-center gap-4 px-6",
          className,
        )}
      >
        <div
          className="relative flex size-28 items-center justify-center rounded-full border-2 border-dashed border-white/15 bg-rimvio-surface/40"
          aria-hidden
        >
          <span className="text-3xl text-white/20">○</span>
        </div>
        <p className="text-center text-sm text-white/45">주머니가 비어 있어요</p>
        <p className="max-w-[16rem] text-center text-[11px] leading-relaxed text-white/35">
          친구를 넣으면 구슬이 하나씩 쌓여요
        </p>
      </div>
    );
  }

  const heightClass =
    variant === "preview" ? "h-12 w-12" : "min-h-[min(52vh,22rem)] w-full";

  return (
    <div
      className={cn("relative mx-auto", heightClass, className)}
      role="list"
      aria-label={`구슬 ${peers.length}개`}
    >
      {peers.map((peer, index) => (
        <MarbleBubble
          key={peer.threadId}
          peer={peer}
          placement={marbleStackPlacement(index, peers.length)}
          variant={variant}
        />
      ))}
    </div>
  );
}
