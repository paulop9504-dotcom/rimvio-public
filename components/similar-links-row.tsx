"use client";

import { getDisplayTitleForLink } from "@/lib/feed/sanitize-link-title";
import { getFeedSiteLabel } from "@/lib/feed/feed-display";
import { HorizontalScrollRail } from "@/components/horizontal-scroll-rail";
import type { LinkRow } from "@/types/database";
import { cn } from "@/lib/utils";

export function SimilarLinksRow({
  current,
  peers,
  onOpen,
  className,
}: {
  current: LinkRow;
  peers: LinkRow[];
  onOpen?: (link: LinkRow) => void;
  className?: string;
}) {
  if (peers.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-2.5", className)} id="similar-links">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          비슷한 링크
        </p>
        {peers.length > 1 ? (
          <span className="text-[10px] text-muted-foreground/80">옆으로 밀기 →</span>
        ) : null}
      </div>
      <HorizontalScrollRail
        fadeFrom="#ffffff"
        hintLabel="더 보기"
        showHint={false}
        scrollClassName="gap-2.5 pb-0.5"
      >
        {peers.map((peer) => {
          const title = getDisplayTitleForLink(peer) ?? getFeedSiteLabel(peer);

          return (
            <button
              key={peer.id}
              type="button"
              onClick={() => onOpen?.(peer)}
              className={cn(
                "inline-flex max-w-[10.5rem] shrink-0 flex-col rounded-2xl px-3.5 py-2.5 text-left",
                "bg-[#f2f2f7] ring-1 ring-black/[0.04] transition-transform active:scale-[0.98]"
              )}
            >
              <span className="line-clamp-2 text-[13px] font-medium leading-snug text-foreground">
                {title}
              </span>
              <span className="mt-1 truncate text-[11px] text-muted-foreground">
                {getFeedSiteLabel(peer)}
              </span>
            </button>
          );
        })}
      </HorizontalScrollRail>
    </div>
  );
}
