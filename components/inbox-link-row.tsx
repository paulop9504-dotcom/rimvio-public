"use client";

import type { MouseEvent } from "react";
import { useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { Check, CircleCheckBig, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { LinkBrandMark } from "@/components/feed-hero-art";
import { trackActionClick, analyticsFromLink } from "@/lib/analytics/track-client";
import {
  shadowPrimaryLink,
  triggerActionHaptic,
} from "@/lib/action-shadowing";
import { markInboxLinkDone } from "@/lib/behavior/completion";
import {
  openLoopClassName,
  resolveOpenLoopHint,
  resolveOpenLoopLevel,
} from "@/lib/behavior/zeigarnik";
import { BURNER_EMOJI, resolveBurnerFromLink } from "@/lib/behavior/burners";
import { openHrefWithFallback } from "@/lib/actions/open-with-fallback";
import { useCopy } from "@/hooks/use-copy";
import { getDisplayTitleForLink } from "@/lib/feed/sanitize-link-title";
import type { LinkRow } from "@/types/database";
import { cn } from "@/lib/utils";

const LONG_PRESS_MS = 480;

type InboxLinkRowProps = {
  link: LinkRow;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
  onEnterSelectMode?: (link: LinkRow) => void;
  onDone?: (link: LinkRow) => void;
};

function resolveInboxOpenHref(link: LinkRow) {
  const openAction = link.actions.find(
    (action) => action.kind === "open" && action.href
  );
  return openAction?.href ?? link.original_url;
}

export function InboxLinkRow({
  link,
  selectable = false,
  selected = false,
  onToggleSelect,
  onEnterSelectMode,
  onDone,
}: InboxLinkRowProps) {
  const router = useRouter();
  const copy = useCopy();
  const openHref = useMemo(() => resolveInboxOpenHref(link), [link]);
  const displayTitle = getDisplayTitleForLink(link);
  const loopLevel = resolveOpenLoopLevel(link);
  const loopHint = resolveOpenLoopHint(link);
  const burner = resolveBurnerFromLink(link);
  const isDone = link.link_status === "done";
  const longPressRef = useRef<number | null>(null);
  const longPressActivatedRef = useRef(false);

  const clearLongPress = () => {
    if (longPressRef.current != null) {
      window.clearTimeout(longPressRef.current);
      longPressRef.current = null;
    }
  };

  const openLink = () => {
    triggerActionHaptic();
    trackActionClick({
      ...analyticsFromLink(link, "inbox"),
      action: {
        id: "inbox-open",
        label: copy.actions.openLink,
        kind: "open",
        href: openHref,
      },
      copySucceeded: false,
    });

    if (openHref.startsWith("/")) {
      router.push(openHref);
      return;
    }

    openHrefWithFallback(openHref, link.original_url);
  };

  const handleDone = async (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    triggerActionHaptic();
    markInboxLinkDone(link);
    onDone?.(link);
    toast.success(copy.behavior.doneRelease, {
      description: copy.behavior.doneReleaseHint,
    });
  };

  const handleClick = () => {
    if (longPressActivatedRef.current) {
      longPressActivatedRef.current = false;
      if (selectable) {
        onToggleSelect?.();
      }
      return;
    }

    if (selectable) {
      onToggleSelect?.();
      return;
    }

    openLink();
  };

  const startLongPress = () => {
    clearLongPress();
    longPressRef.current = window.setTimeout(() => {
      longPressActivatedRef.current = true;
      triggerActionHaptic();
      onEnterSelectMode?.(link);
    }, LONG_PRESS_MS);
  };

  return (
    <motion.div
      layout
      initial={false}
      className={cn(
        "inbox-golden-row group w-full",
        openLoopClassName(loopLevel),
        isDone && "opacity-60"
      )}
    >
      <button
        type="button"
        onClick={handleClick}
        onMouseEnter={
          selectable ? undefined : () => shadowPrimaryLink(openHref, router, "hover")
        }
        onTouchStart={() => {
          if (!selectable) {
            shadowPrimaryLink(openHref, router, "touch");
          }
          startLongPress();
        }}
        onTouchEnd={clearLongPress}
        onTouchMove={clearLongPress}
        onMouseDown={selectable ? undefined : startLongPress}
        onMouseUp={clearLongPress}
        onMouseLeave={clearLongPress}
        className={cn(
          "flex min-w-0 flex-1 items-center gap-[var(--space-u)] text-left",
          "transition-colors hover:bg-rimvio-surface-muted/80 active:bg-rimvio-surface-muted",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#007AFF]/30 focus-visible:ring-inset",
          selectable && selected && "bg-rimvio-neon-purple/[0.06]"
        )}
      >
        {selectable ? (
          <span
            className={cn(
              "flex size-[var(--inbox-thumb)] shrink-0 items-center justify-center rounded-full border-2 transition-colors",
              selected
                ? "border-[#007AFF] bg-rimvio-neon-purple text-white"
                : "border-black/15 bg-background text-transparent"
            )}
            aria-hidden
          >
            <Check className="size-4" strokeWidth={3} />
          </span>
        ) : (
          <LinkBrandMark link={link} className="size-[var(--inbox-thumb)]" />
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px]" aria-hidden>
              {BURNER_EMOJI[burner]}
            </span>
            <p className="truncate text-[15px] font-semibold leading-snug tracking-tight">
              {displayTitle ?? link.domain}
            </p>
          </div>
          <p className="mt-[calc(var(--space-u)*0.5)] truncate text-xs text-muted-foreground">
            {link.domain}
          </p>
          {loopHint && !selectable ? (
            <p className="mt-1 truncate text-[11px] text-[#FF9500]">{loopHint}</p>
          ) : null}
        </div>

        {!selectable ? (
          <ExternalLink
            className="mr-1 size-4 shrink-0 text-rimvio-neon-cyan/70 opacity-80"
            strokeWidth={2}
            aria-hidden
          />
        ) : null}
      </button>

      {!selectable && !isDone ? (
        <button
          type="button"
          onClick={handleDone}
          className={cn(
            "mr-3 flex size-10 shrink-0 items-center justify-center rounded-full",
            "bg-[#34C759]/10 text-[#34C759] transition-transform active:scale-90",
            "opacity-100 md:opacity-70 md:group-hover:opacity-100"
          )}
          aria-label={copy.behavior.doneButton}
        >
          <CircleCheckBig className="size-5" strokeWidth={2.2} />
        </button>
      ) : null}
    </motion.div>
  );
}
