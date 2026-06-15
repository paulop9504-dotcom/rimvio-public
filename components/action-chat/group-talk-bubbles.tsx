"use client";

import { Users } from "lucide-react";
import type { GroupTalkTarget } from "@/lib/peer-chat/group-talk-target-types";
import { prefetchPeerMessages } from "@/lib/peer-chat/message-prefetch-cache";
import { cn } from "@/lib/utils";

type GroupTalkBubblesProps = {
  groups: readonly GroupTalkTarget[];
  onPick: (group: GroupTalkTarget) => void;
  className?: string;
};

export function GroupTalkBubbles({ groups, onPick, className }: GroupTalkBubblesProps) {
  if (groups.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex gap-2 overflow-x-auto px-0.5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
    >
      {groups.map((group) => (
        <button
          key={group.peerThreadId}
          type="button"
          onMouseEnter={() => prefetchPeerMessages(group.peerThreadId)}
          onTouchStart={() => prefetchPeerMessages(group.peerThreadId)}
          onClick={() => onPick(group)}
          className="flex w-[4.25rem] shrink-0 flex-col items-center gap-1 active:scale-95"
          aria-label={`${group.displayName} 단톡`}
        >
          <span className="flex size-11 items-center justify-center rounded-2xl bg-white/10 text-white/80 ring-1 ring-white/12">
            <Users className="size-4" aria-hidden />
          </span>
          <span className="line-clamp-2 w-full text-center text-[10px] font-medium leading-tight text-white/72">
            {group.displayName}
          </span>
        </button>
      ))}
    </div>
  );
}
