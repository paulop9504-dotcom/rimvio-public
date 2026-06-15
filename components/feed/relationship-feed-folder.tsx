"use client";

import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { RelationshipFeedSlotSheet } from "@/components/feed/relationship-feed-slot-sheet";
import { useRelationshipFeedSlots } from "@/hooks/use-relationship-feed-slots";
import { cn } from "@/lib/utils";

type RelationshipFeedFolderProps = {
  className?: string;
};

/** Feed header: DM folder beside resource pool (Kakao-style slot list). */
export function RelationshipFeedFolder({ className }: RelationshipFeedFolderProps) {
  const [open, setOpen] = useState(false);
  const { slots, unreadTotal, refresh, useRemote } = useRelationshipFeedSlots(true);
  const hasUnread = unreadTotal > 0;

  if (!useRemote) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        aria-label={
          hasUnread
            ? `새 톡 ${unreadTotal}건`
            : `대화 ${slots.length}개`
        }
        onClick={() => {
          void refresh();
          setOpen(true);
        }}
        className={cn(
          "relative flex size-8 items-center justify-center rounded-full transition-all active:scale-95 sm:size-9",
          hasUnread
            ? "text-amber-400 hover:text-amber-300"
            : "bg-transparent text-muted-foreground hover:text-foreground",
          className,
        )}
      >
        <MessageCircle
          className={cn(
            "size-[1.15rem] sm:size-5",
            hasUnread &&
              "fill-amber-400/30 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]",
          )}
          strokeWidth={hasUnread ? 2.5 : 2.1}
        />
        {hasUnread ? (
          <span className="absolute -right-0.5 -top-0.5 flex size-4 min-w-4 items-center justify-center rounded-full bg-amber-400 px-0.5 text-[9px] font-extrabold tabular-nums leading-none text-slate-900 shadow-[0_0_8px_rgba(251,191,36,0.45)] sm:-right-1 sm:-top-1 sm:size-[1.125rem] sm:min-w-[1.125rem] sm:text-[10px]">
            {unreadTotal > 9 ? "9+" : unreadTotal}
          </span>
        ) : null}
      </button>

      <RelationshipFeedSlotSheet
        open={open}
        onOpenChange={setOpen}
        slots={slots}
        onRefresh={() => void refresh()}
      />
    </>
  );
}
