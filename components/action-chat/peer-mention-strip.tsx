"use client";

import type { PeerMentionSuggestion } from "@/lib/context/suggest-peer-mentions";
import { cn } from "@/lib/utils";

type PeerMentionStripProps = {
  suggestions: PeerMentionSuggestion[];
  onSelect: (item: PeerMentionSuggestion) => void;
  className?: string;
};

export function PeerMentionStrip({
  suggestions,
  onSelect,
  className,
}: PeerMentionStripProps) {
  if (suggestions.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex gap-2 overflow-x-auto px-1 pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className
      )}
      aria-label="친한 친구 멘션"
    >
      {suggestions.map((item) => (
        <button
          key={item.peerThreadId}
          type="button"
          onClick={() => onSelect(item)}
          className="flex shrink-0 items-center gap-1 rounded-full border border-amber-200/90 bg-amber-50 px-3 py-1.5 text-[12px] font-medium text-amber-900 shadow-sm active:scale-95"
        >
          <span aria-hidden className="text-[13px]">
            @
          </span>
          {item.displayName}
        </button>
      ))}
    </div>
  );
}
