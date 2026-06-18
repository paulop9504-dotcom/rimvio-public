"use client";

import { cn } from "@/lib/utils";
import type { RankedContextResource } from "@/lib/globe/resource/map-hub-service-to-resource";
import { readLodgingPayloadFromResource } from "@/lib/globe/context-hub/read-lodging-resource-inventory";
import { copy } from "@/lib/copy/human-ko";

export type GlobeLodgingMapStripProps = {
  ranked: readonly RankedContextResource[];
  activeIndex: number;
  onSelectIndex: (index: number) => void;
  className?: string;
};

/** View-only — renders ranked lodging markers; map flyTo handled by parent. */
export function GlobeLodgingMapStrip({
  ranked,
  activeIndex,
  onSelectIndex,
  className,
}: GlobeLodgingMapStripProps) {
  const lodgingEntries = ranked
    .map((entry, index) => ({ entry, index }))
    .filter(({ entry }) => entry.resource.kind === "lodging_voucher");

  if (lodgingEntries.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "pointer-events-auto flex max-w-[min(100vw-1.5rem,24rem)] gap-1.5 overflow-x-auto rounded-2xl border border-border/60 bg-card/95 p-2 shadow-lg backdrop-blur-xl",
        className,
      )}
      data-globe-lodging-map-strip
      role="tablist"
      aria-label={copy.globe.lodgingMapStripAria}
    >
      {lodgingEntries.map(({ entry, index }) => {
        const payload = readLodgingPayloadFromResource(entry.resource);
        const thumb = payload?.images[0] ?? null;
        const active = index === activeIndex;
        return (
          <button
            key={entry.resource.resourceId}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onSelectIndex(index)}
            className={cn(
              "flex min-w-[5.5rem] shrink-0 flex-col overflow-hidden rounded-xl border text-left transition",
              active
                ? "border-primary bg-primary/[0.08] ring-2 ring-primary/30"
                : "border-border/50 bg-card active:scale-[0.98]",
            )}
            data-globe-lodging-marker={entry.resource.resourceId}
          >
            <span className="relative block h-12 w-full bg-muted/40">
              {thumb ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={thumb} alt="" className="size-full object-cover" draggable={false} />
              ) : (
                <span className="flex size-full items-center justify-center text-[10px] text-muted-foreground">
                  {copy.globe.lodgingMapStripFallback}
                </span>
              )}
            </span>
            <span className="truncate px-1.5 py-1 text-[10px] font-semibold text-foreground">
              {entry.resource.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
