"use client";

import { memo } from "react";
import {
  useGlobeEarthTexture,
  type GlobeEarthMapVariant,
} from "@/hooks/use-globe-earth-texture";
import { cn } from "@/lib/utils";

export type GlobeEarthSurfaceProps = {
  className?: string;
  mapVariant?: GlobeEarthMapVariant;
};

/**
 * Full-earth equirectangular surface (2:1).
 * Pins and pan math use the same projection via projectLatLngToMapPercent.
 */
export const GlobeEarthSurface = memo(function GlobeEarthSurface({
  className,
  mapVariant = "satellite",
}: GlobeEarthSurfaceProps) {
  const toss = mapVariant === "toss";
  const { textureUrl, loading, error } = useGlobeEarthTexture(mapVariant);

  return (
    <div
      className={cn("absolute inset-0 overflow-hidden rounded-full", className)}
      data-globe-earth-surface={mapVariant}
    >
      {loading ? (
        <div
          className={cn(
            "absolute inset-0 animate-pulse rounded-full",
            toss ? "bg-[#e8f3ff]" : "bg-[#142238]",
          )}
          aria-hidden
        />
      ) : null}

      {textureUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={textureUrl}
          alt=""
          draggable={false}
          className={cn(
            "absolute left-0 top-0 h-full w-[200%] max-w-none select-none object-cover",
            toss
              ? "rimvio-globe-earth-surface__map--toss"
              : "brightness-[1.04] contrast-[1.06] saturate-[1.1]",
          )}
          decoding="async"
        />
      ) : error ? (
        <div
          className={cn(
            "absolute inset-0 rounded-full",
            toss ? "bg-[#e8f3ff]" : "bg-[#142238]",
          )}
          aria-hidden
        />
      ) : null}

      {toss ? (
        <div
          className="pointer-events-none absolute inset-0 rounded-full rimvio-globe-earth-surface__shade--toss"
          aria-hidden
        />
      ) : (
        <>
          <div className="pointer-events-none absolute inset-0 rounded-full rimvio-globe-satellite-shade" />
          <div className="pointer-events-none absolute inset-0 rounded-full rimvio-globe-atmosphere" />
          <div className="pointer-events-none absolute inset-0 rounded-full rimvio-globe-terminator" />
          <div className="pointer-events-none absolute inset-0 rounded-full rimvio-globe-earth-limb" />
        </>
      )}

      <p
        className={cn(
          "pointer-events-none absolute bottom-2 right-2 text-[7px] font-medium",
          toss ? "text-[#8b95a1]/80" : "text-white/40",
        )}
      >
        {toss ? "© OSM · CARTO" : "© Esri · Maxar"}
      </p>
    </div>
  );
});
