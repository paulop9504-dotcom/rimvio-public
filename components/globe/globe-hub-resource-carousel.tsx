"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, useMotionValue, animate, type PanInfo } from "framer-motion";
import { Car, ChevronDown, Hotel, Plane, Sparkles, Ticket } from "lucide-react";
import type { ContextHubServiceId } from "@/lib/globe/context-hub/context-hub-service-catalog";
import { GlobeLodgingMediaHero } from "@/components/globe/globe-lodging-media-hero";
import { readLodgingPayloadFromResource } from "@/lib/globe/context-hub/read-lodging-resource-inventory";
import type { RankedContextResource } from "@/lib/globe/resource/map-hub-service-to-resource";
import { useHubResourceCurationTelemetry } from "@/hooks/use-hub-resource-curation-telemetry";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";

const SERVICE_ICON: Record<ContextHubServiceId, typeof Plane> = {
  ticket: Ticket,
  flight: Plane,
  lodging: Hotel,
  rental_car: Car,
  ai_search: Sparkles,
};

const SWIPE_THRESHOLD_PX = 48;
const STANDARD_WIDTH = "w-[min(calc(100vw-1.5rem),17.5rem)]";
const COMPACT_WIDTH = "w-[min(calc(100vw-1.5rem),12rem)]";

export type GlobeHubResourceCarouselProps = {
  ranked: readonly RankedContextResource[];
  index: number;
  onIndexChange: (index: number) => void;
  onRunRow: (entry: RankedContextResource) => void;
  onExpand: () => void;
  onDismiss?: () => void;
  busy?: boolean;
  contextPlace?: string | null;
  layout?: "dock" | "hero";
  variant?: "default" | "compact";
  /** Predictive Curation telemetry — non-blocking. */
  contextId?: string | null;
  lat?: number | null;
  lng?: number | null;
  authUserId?: string | null;
  telemetryEnabled?: boolean;
  className?: string;
};

function resolveResourceSubtitle(entry: RankedContextResource): string {
  const row = entry.hubRow;
  if (!row.implemented) {
    return copy.globe.contextHubServiceSoon;
  }
  if (entry.resource.shortLabel) {
    return entry.resource.shortLabel;
  }
  if (row.connected && row.link?.shortLabel) {
    return row.link.shortLabel;
  }
  if (row.connected) {
    return copy.globe.contextHubDepartureKind;
  }
  return copy.globe.contextHubServicePlugIn;
}

/** Per-context hub — index 0 = MAIN JIT resource; swipe explores siblings. */
export function GlobeHubResourceCarousel({
  ranked,
  index,
  onIndexChange,
  onRunRow,
  onExpand,
  onDismiss,
  busy = false,
  contextPlace = null,
  layout = "dock",
  variant = "default",
  contextId = null,
  lat = null,
  lng = null,
  authUserId = null,
  telemetryEnabled = true,
  className,
}: GlobeHubResourceCarouselProps) {
  const entry = ranked[index] ?? ranked[0];
  const row = entry?.hubRow;
  const resource = entry?.resource;
  const isMainSlot = index === 0;
  const dragX = useMotionValue(0);
  const [hintSeen, setHintSeen] = useState(false);

  const { mainCardRef, emitMainDismissed, emitManualPick, goToWithTelemetry } =
    useHubResourceCurationTelemetry({
      contextId,
      ranked,
      index,
      lat,
      lng,
      authUserId,
      enabled: telemetryEnabled,
    });

  useEffect(() => {
    dragX.set(0);
  }, [dragX, index]);

  useEffect(() => {
    if (ranked.length <= 1 || hintSeen) {
      return;
    }
    try {
      if (sessionStorage.getItem("rimvio-hub-swipe-hint-seen") === "true") {
        setHintSeen(true);
      }
    } catch {
      /* ignore */
    }
  }, [hintSeen, ranked.length]);

  const markHintSeen = useCallback(() => {
    setHintSeen(true);
    try {
      sessionStorage.setItem("rimvio-hub-swipe-hint-seen", "true");
    } catch {
      /* ignore */
    }
  }, []);

  const goTo = useCallback(
    (next: number) => {
      if (next < 0 || next >= ranked.length || next === index) {
        return false;
      }
      markHintSeen();
      onIndexChange(next);
      return true;
    },
    [index, markHintSeen, onIndexChange, ranked.length],
  );

  const onDragEnd = useCallback(
    (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      const offset = info.offset.x;
      const velocity = info.velocity.x;
      const swipeNext = offset < -SWIPE_THRESHOLD_PX || velocity < -420;
      const swipePrev = offset > SWIPE_THRESHOLD_PX || velocity > 420;

      if (swipeNext) {
        if (index === 0) {
          goToWithTelemetry(index + 1, goTo, "swipe_next");
        } else if (!goTo(index + 1) && index === ranked.length - 1) {
          goTo(0);
        } else {
          goTo(index + 1);
        }
      } else if (swipePrev) {
        if (index === 0 && onDismiss) {
          emitMainDismissed("swipe_away");
          onDismiss();
        } else {
          goTo(index - 1);
        }
      }
      animate(dragX, 0, { type: "spring", stiffness: 520, damping: 36 });
    },
    [
      dragX,
      emitMainDismissed,
      goTo,
      goToWithTelemetry,
      index,
      onDismiss,
      ranked.length,
    ],
  );

  const handleCardClick = useCallback(() => {
    if (!entry) {
      return;
    }
    if (index > 0) {
      emitManualPick(entry, index);
    }
    onRunRow(entry);
  }, [emitManualPick, entry, index, onRunRow]);

  if (!entry || !row || !resource) {
    return null;
  }

  const showSwipeHint = ranked.length > 1 && !hintSeen && isMainSlot;
  const Icon = SERVICE_ICON[row.serviceId];
  const heroLayout = layout === "hero" && isMainSlot;
  const compact = variant === "compact";
  const lodgingPayload =
    resource.kind === "lodging_voucher"
      ? readLodgingPayloadFromResource(resource)
      : null;
  const showLodgingHero =
    !compact && Boolean(lodgingPayload && (heroLayout || isMainSlot));

  return (
    <aside
      className={cn(
        "pointer-events-auto overflow-hidden rounded-[1.35rem] border backdrop-blur-xl",
        heroLayout
          ? "w-full max-w-md border-primary/30 bg-card/95 shadow-[0_14px_44px_rgba(2,32,71,0.14)]"
          : cn(
              "border-border/60 bg-card/95 shadow-[0_10px_32px_rgba(2,32,71,0.1)]",
              compact ? COMPACT_WIDTH : STANDARD_WIDTH,
            ),
        className,
      )}
      data-globe-hub-carousel
      data-globe-hub-main={isMainSlot ? "true" : "false"}
      data-globe-hub-variant={variant}
      aria-label={copy.globe.contextHubRailTitle}
    >
      {compact ? (
        <div className="flex items-center gap-1 border-b border-border/50 px-2 py-1.5">
          <span className="min-w-0 flex-1 truncate text-[10px] font-semibold text-muted-foreground">
            {contextPlace ?? copy.globe.contextHubEyebrow}
          </span>
          <button
            type="button"
            onClick={onExpand}
            className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted/60 active:bg-muted"
            aria-label={copy.globe.contextHubExpandAria}
            data-globe-hub-rail-expand
          >
            <ChevronDown className="size-3.5 text-muted-foreground" aria-hidden />
          </button>
        </div>
      ) : (
      <div className="border-b border-border/50 px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-primary">
              {isMainSlot ? copy.globe.mainActionEyebrow : copy.globe.contextHubEyebrow}
            </p>
            {contextPlace ? (
              <p className="truncate text-[11px] font-medium text-muted-foreground">
                {isMainSlot
                  ? copy.globe.mainActionForContext(resource.label, contextPlace)
                  : copy.globe.contextHubRailForContext(contextPlace)}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onExpand}
            className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted/60 active:bg-muted"
            aria-label={copy.globe.contextHubExpandAria}
            data-globe-hub-rail-expand
          >
            <ChevronDown className="size-4 text-muted-foreground" aria-hidden />
          </button>
        </div>
      </div>
      )}

      <div className={cn("relative px-2 pb-2", compact ? "pt-1" : "pt-1.5")}>
        {showLodgingHero && lodgingPayload ? (
          <GlobeLodgingMediaHero
            payload={lodgingPayload}
            label={resource.label}
            priceLabel={resource.shortLabel}
            heroLayout={heroLayout}
          />
        ) : null}
        <motion.button
          ref={isMainSlot ? mainCardRef : undefined}
          type="button"
          disabled={busy}
          drag={ranked.length > 1 ? "x" : false}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.14}
          style={{ x: dragX }}
          onDragEnd={onDragEnd}
          onClick={handleCardClick}
          className={cn(
            "flex w-full items-center gap-2.5 rounded-2xl border px-2.5 text-left active:scale-[0.99]",
            compact ? "py-2" : heroLayout ? "border-primary/25 bg-primary/[0.06] py-4" : "py-3",
            isMainSlot && !heroLayout && !compact
              ? "border-primary/25 bg-primary/[0.05]"
              : !isMainSlot && row.connected
                ? "border-primary/20 bg-primary/[0.04]"
                : compact
                  ? "border-border/40 bg-card/90"
                  : "border-border/50 bg-card",
          )}
          data-globe-hub-carousel-index={index}
          data-globe-resource-id={resource.resourceId}
        >
          <span
            className={cn(
              "flex shrink-0 items-center justify-center rounded-xl",
              compact ? "size-8" : heroLayout ? "size-12 bg-primary/12 text-primary" : "size-10",
              isMainSlot || row.connected
                ? "bg-primary/10 text-primary"
                : "bg-muted/70 text-muted-foreground",
            )}
          >
            <Icon className={compact ? "size-4" : heroLayout ? "size-5" : "size-[1.125rem]"} aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span
              className={cn(
                "block truncate font-semibold text-foreground",
                compact ? "text-[12px]" : heroLayout ? "text-[16px]" : "text-[14px]",
              )}
            >
              {resource.label}
            </span>
            {!compact ? (
            <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
              {resolveResourceSubtitle(entry)}
            </span>
            ) : null}
          </span>
          {ranked.length > 1 ? (
            <span className="shrink-0 text-[11px] font-semibold text-primary/70" aria-hidden>
              →
            </span>
          ) : null}
        </motion.button>

        {showSwipeHint && !compact ? (
          <p className="mt-1.5 text-center text-[10px] font-medium text-muted-foreground">
            {copy.globe.contextHubSwipeHint}
          </p>
        ) : null}

        {ranked.length > 1 ? (
          <div
            className="mt-2 flex items-center justify-center gap-1.5"
            role="tablist"
            aria-label={copy.globe.contextHubCarouselDotsAria}
          >
            {ranked.map((item, dotIndex) => (
              <button
                key={item.resource.resourceId}
                type="button"
                role="tab"
                aria-selected={dotIndex === index}
                onClick={() => goToWithTelemetry(dotIndex, goTo, "carousel_dot")}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  dotIndex === index
                    ? "w-4 bg-primary"
                    : "w-1.5 bg-muted-foreground/35",
                )}
              />
            ))}
          </div>
        ) : null}
      </div>
    </aside>
  );
}
