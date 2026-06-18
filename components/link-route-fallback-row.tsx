"use client";

import { useMemo } from "react";
import { runLinkActionForLink } from "@/lib/actions/run-link-action-for-link";
import { trackActionClick, analyticsFromLink } from "@/lib/analytics/track-client";
import { cleanFeedActionLabel } from "@/lib/feed/feed-display";
import { buildFallbackModeActions } from "@/lib/routing/apply-routing";
import { routeLink } from "@/lib/routing/intelligent-router";
import { useCopy, useAppLocale } from "@/hooks/use-copy";
import type { LinkRow } from "@/types/database";
import { cn } from "@/lib/utils";
import { HorizontalScrollRail } from "@/components/horizontal-scroll-rail";

type LinkRouteFallbackRowProps = {
  link: LinkRow;
  className?: string;
};

export function LinkRouteFallbackRow({ link, className }: LinkRouteFallbackRowProps) {
  const copy = useCopy();
  const locale = useAppLocale();

  const routing = useMemo(
    () =>
      routeLink({
        url: link.original_url,
        domain: link.domain,
        title: link.title,
        source_type: link.source_type as never,
      }),
    [link.domain, link.original_url, link.source_type, link.title]
  );

  const fallbackActions = useMemo(
    () =>
      buildFallbackModeActions({
        sourceUrl: link.original_url,
        domain: link.domain,
        title: link.title,
        linkCategory: link.category,
        sourceType: link.source_type,
      }),
    [link.category, link.domain, link.original_url, link.source_type, link.title]
  );

  if (!routing.needsFallback) {
    return null;
  }

  return (
    <div className={cn("space-y-1.5", className)}>
      <p className="text-center text-[12px] font-medium text-[#FF9500]">
        {copy.routing.fallbackPrompt}
      </p>
      <HorizontalScrollRail
        fadeFrom="#ffffff"
        hintLabel={copy.routing.fallbackHint}
        showHint={false}
        scrollClassName="gap-[var(--space-u)] pb-0.5"
      >
        {fallbackActions.map((action) => (
          <button
            key={action.id}
            type="button"
            onClick={async () => {
              const result = await runLinkActionForLink(action, link);
              trackActionClick({
                ...analyticsFromLink(link, "feed"),
                action,
                copySucceeded: Boolean(result.copiedText || result.sharedText),
              });
            }}
            className={cn(
              "inline-flex shrink-0 items-center rounded-full px-4 py-2",
              "bg-[#FFF4E5] text-[14px] font-medium text-[#C93400]",
              "ring-1 ring-[#FF9500]/20 transition-transform active:scale-[0.98]"
            )}
          >
            {cleanFeedActionLabel(action.label, locale)}
          </button>
        ))}
      </HorizontalScrollRail>
    </div>
  );
}
