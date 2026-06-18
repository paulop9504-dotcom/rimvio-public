"use client";

import { cn } from "@/lib/utils";
import type { LodgingResourcePayload } from "@/lib/globe/context-hub/lodging-resource-types";
import { copy } from "@/lib/copy/human-ko";

export function GlobeLodgingMediaHero({
  payload,
  label,
  priceLabel,
  heroLayout = false,
}: {
  payload: LodgingResourcePayload;
  label: string;
  priceLabel?: string | null;
  heroLayout?: boolean;
}) {
  const image = payload.images[0] ?? null;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border/50 bg-muted/20",
        heroLayout ? "mb-2" : "mb-1.5",
      )}
      data-globe-lodging-media-hero
    >
      {payload.videoUrl ? (
        <video
          src={payload.videoUrl}
          className="aspect-[16/10] w-full object-cover"
          autoPlay
          loop
          muted
          playsInline
        />
      ) : image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image}
          alt=""
          className="aspect-[16/10] w-full object-cover"
          draggable={false}
        />
      ) : (
        <div className="flex aspect-[16/10] items-center justify-center text-[11px] text-muted-foreground">
          {copy.globe.lodgingMediaFallback}
        </div>
      )}
      <div className="px-2.5 py-2">
        <p className="truncate text-[13px] font-semibold text-foreground">{label}</p>
        {priceLabel ? (
          <p className="mt-0.5 text-[11px] font-medium text-primary">{priceLabel}</p>
        ) : null}
      </div>
    </div>
  );
}
