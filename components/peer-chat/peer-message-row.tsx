"use client";

import { PeerProfileAvatar } from "@/components/peer-chat/peer-profile-avatar";
import { DM_CHAT } from "@/lib/peer-chat/dm-chat-density";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export type PeerMessageRowProfile = {
  displayName: string;
  avatarUrl?: string | null;
  rimvioId?: string | null;
};

type PeerMessageRowProps = {
  isMe: boolean;
  peer?: PeerMessageRowProfile | null;
  /** 클러스터 마지막 말풍선에만 아바타 (인스타 DM) */
  showPeerAvatar?: boolean;
  /** 상대 말풍선 — 아바타 옆에 @아이디 한 줄 (인스타 DM 헤더 느낌) */
  showPeerHandle?: boolean;
  children: ReactNode;
  className?: string;
};

export function PeerMessageRow({
  isMe,
  peer,
  showPeerAvatar = true,
  showPeerHandle = false,
  children,
  className,
}: PeerMessageRowProps) {
  const peerName = peer?.displayName?.trim() || "친구";
  const handle = peer?.rimvioId?.trim();

  if (isMe) {
    return (
      <div className={cn("flex w-full max-w-full justify-end", className)}>
        <div
          className={cn(
            "flex max-w-[min(88%,18rem)] flex-col items-end",
            DM_CHAT.rowGap,
          )}
        >
          {children}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex w-full max-w-full items-end",
        DM_CHAT.rowGap,
        className,
      )}
    >
      {showPeerAvatar ? (
        <PeerProfileAvatar
          displayName={peerName}
          avatarUrl={peer?.avatarUrl}
          size="xs"
          className="mb-0.5 shrink-0"
        />
      ) : (
        <span className="size-8 shrink-0" aria-hidden />
      )}
      <div className="flex min-w-0 max-w-[min(calc(100%-2.25rem),18rem)] flex-1 flex-col gap-0.5">
        {showPeerHandle && handle ? (
          <p className="truncate px-0.5 text-[11px] font-semibold text-muted-foreground">
            @{handle}
          </p>
        ) : null}
        {children}
      </div>
    </div>
  );
}
