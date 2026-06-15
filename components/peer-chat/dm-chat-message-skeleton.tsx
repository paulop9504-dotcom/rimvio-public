"use client";

import { DM_CHAT } from "@/lib/peer-chat/dm-chat-density";
import { cn } from "@/lib/utils";

const PLACEHOLDERS = [
  { side: "start" as const, w: "w-[38%]" },
  { side: "end" as const, w: "w-[28%]" },
  { side: "start" as const, w: "w-[52%]" },
  { side: "end" as const, w: "w-[44%]" },
  { side: "start" as const, w: "w-[32%]" },
];

export function DmChatMessageSkeleton({ className }: { className?: string }) {
  return (
    <ul
      className={cn("flex flex-col", DM_CHAT.listGap, className)}
      aria-hidden
    >
      {PLACEHOLDERS.map((row, i) => (
        <li
          key={i}
          className={cn("flex", row.side === "end" ? "justify-end" : "justify-start")}
        >
          <div
            className={cn(
              "h-[31px] animate-pulse rounded-[18px] bg-muted",
              row.w,
              row.side === "end" ? DM_CHAT.bubbleMeCorner : DM_CHAT.bubblePeerCorner,
            )}
          />
        </li>
      ))}
    </ul>
  );
}
