"use client";

import { getFeedSiteLabel } from "@/lib/feed/feed-display";
import { getDisplayTitleForLink } from "@/lib/feed/sanitize-link-title";
import type { RelatedLinkPreview } from "@/lib/links/discover-related-links";
import { HorizontalScrollRail } from "@/components/horizontal-scroll-rail";
import type { LinkRow } from "@/types/database";
import { cn } from "@/lib/utils";

export function RelatedLinksRow({
  items,
  loading = false,
  peerLinks = [],
  onOpen,
  className,
}: {
  items: RelatedLinkPreview[];
  loading?: boolean;
  peerLinks?: LinkRow[];
  onOpen?: (link: LinkRow) => void;
  className?: string;
}) {
  if (!loading && items.length === 0) {
    return null;
  }

  const handleOpen = (item: RelatedLinkPreview) => {
    const saved = peerLinks.find(
      (peer) =>
        peer.original_url.replace(/\/$/, "") ===
        item.original_url.replace(/\/$/, "")
    );

    if (saved) {
      onOpen?.(saved);
      return;
    }

    window.open(item.original_url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className={cn("space-y-2.5", className)} id="related-links">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          관련 링크
        </p>
        <span className="text-[10px] text-muted-foreground/80">
          {loading ? "찾는 중…" : "80%+ 연관"}
        </span>
      </div>

      {loading && items.length === 0 ? (
        <div className="flex gap-2.5 overflow-hidden">
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              className="h-[3.75rem] w-[10.5rem] shrink-0 animate-pulse rounded-2xl bg-[#f2f2f7]"
            />
          ))}
        </div>
      ) : (
        <HorizontalScrollRail
          fadeFrom="#ffffff"
          hintLabel="더 보기"
          showHint={false}
          scrollClassName="gap-2.5 pb-0.5"
        >
          {items.map((item) => {
            const title =
              getDisplayTitleForLink({
                title: item.title,
                original_url: item.original_url,
                domain: item.domain,
                category: item.category,
              }) ?? item.title;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleOpen(item)}
                className={cn(
                  "inline-flex max-w-[10.5rem] shrink-0 flex-col rounded-2xl px-3.5 py-2.5 text-left",
                  "bg-[#eef6ff] ring-1 ring-[#007AFF]/10 transition-transform active:scale-[0.98]"
                )}
              >
                <span className="line-clamp-2 text-[13px] font-medium leading-snug text-foreground">
                  {title}
                </span>
                <span className="mt-1 flex items-center gap-1 truncate text-[11px] text-muted-foreground">
                  <span>{getFeedSiteLabel({ domain: item.domain, category: item.category })}</span>
                  <span className="text-[#007AFF]/80">· {item.relevance}%</span>
                </span>
              </button>
            );
          })}
        </HorizontalScrollRail>
      )}
    </div>
  );
}
