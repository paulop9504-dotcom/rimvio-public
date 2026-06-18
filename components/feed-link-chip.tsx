"use client";

import { LINK_CATEGORY_LABELS } from "@/lib/categories/types";
import { resolveLinkBrand } from "@/lib/feed/link-brand-art";
import { getDisplayTitleForLink } from "@/lib/feed/sanitize-link-title";
import { LinkBrandMark } from "@/components/feed-hero-art";
import type { LinkRow } from "@/types/database";
import { cn } from "@/lib/utils";

/** Minimal link identity ??no empty hero frame. */
export function FeedLinkChip({
  link,
  className,
}: {
  link: LinkRow;
  className?: string;
}) {
  const brand = resolveLinkBrand(link);
  const title =
    getDisplayTitleForLink(link) ?? brand.displayName;
  const category = LINK_CATEGORY_LABELS[brand.category];

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-2xl bg-[#eef0f4]/90 px-3 py-2.5",
        "ring-1 ring-rimvio-neon-purple/12",
        className
      )}
    >
      <LinkBrandMark link={link} className="size-10 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-semibold tracking-tight text-foreground">
          {title}
        </p>
        <p className="truncate text-[11px] font-medium text-muted-foreground">
          {brand.displayName} · {category}
        </p>
      </div>
    </div>
  );
}
