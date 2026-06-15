"use client";

import { memo, useCallback, useMemo, useState } from "react";
import {
  buildGlobeMapTileGrid,
  globeMapTileAttribution,
  resolveGlobeMapZoom,
  type GlobeMapTileStyle,
} from "@/lib/experience-graph/build-globe-map-tiles";
import { resolveGlobeTileUpstreamUrl } from "@/lib/experience-graph/resolve-globe-tile-upstream";
import { cn } from "@/lib/utils";

function parseProxyTileUrl(url: string): { z: number; x: number; y: number; style: GlobeMapTileStyle } | null {
  try {
    const parsed = new URL(url, "http://local");
    if (!parsed.pathname.endsWith("/api/globe/tile")) {
      return null;
    }
    const z = Number(parsed.searchParams.get("z"));
    const x = Number(parsed.searchParams.get("x"));
    const y = Number(parsed.searchParams.get("y"));
    const style = (parsed.searchParams.get("style")?.trim() || "satellite") as GlobeMapTileStyle;
    if (!Number.isFinite(z) || !Number.isFinite(x) || !Number.isFinite(y)) {
      return null;
    }
    return { z, x, y, style };
  } catch {
    return null;
  }
}

export type GlobeMapLayerProps = {
  lat: number;
  lng: number;
  globeZoom?: number;
  tileStyle?: GlobeMapTileStyle;
  className?: string;
};

/** Satellite map tiles clipped inside the Rimvio globe sphere. */
export const GlobeMapLayer = memo(function GlobeMapLayer({
  lat,
  lng,
  globeZoom = 1.65,
  tileStyle = "satellite",
  className,
}: GlobeMapLayerProps) {
  const mapZoom = resolveGlobeMapZoom(globeZoom, tileStyle);
  const gridSize = tileStyle === "satellite" ? 5 : 3;
  const grid = useMemo(
    () => buildGlobeMapTileGrid(lat, lng, mapZoom, gridSize, tileStyle),
    [lat, lng, mapZoom, gridSize, tileStyle],
  );
  const satellite = tileStyle === "satellite";
  const [fallbackUrls, setFallbackUrls] = useState<Record<string, string>>({});

  const onTileError = useCallback((tileKey: string, proxyUrl: string) => {
    const coords = parseProxyTileUrl(proxyUrl);
    if (!coords) {
      return;
    }
    const upstream = resolveGlobeTileUpstreamUrl(coords);
    if (!upstream) {
      return;
    }
    setFallbackUrls((prev) =>
      prev[tileKey] === upstream ? prev : { ...prev, [tileKey]: upstream },
    );
  }, []);

  return (
    <div className={cn("absolute inset-0 overflow-hidden rounded-full", className)}>
      <div
        className={cn(
          "absolute left-1/2 top-1/2 grid bg-[#142238]",
          gridSize === 5 ? "grid-cols-5 grid-rows-5" : "grid-cols-3 grid-rows-3",
        )}
        style={{
          width: grid.gridPx,
          height: grid.gridPx,
          transform: `translate(calc(-${grid.focalOffsetX}px), calc(-${grid.focalOffsetY}px))`,
        }}
        aria-hidden
      >
        {grid.tiles.map((tile) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={tile.key}
            src={fallbackUrls[tile.key] ?? tile.url}
            alt=""
            width={256}
            height={256}
            className={cn(
              "block size-full object-cover",
              satellite && "brightness-[1.05] contrast-[1.08] saturate-[1.12]",
            )}
            loading="eager"
            draggable={false}
            referrerPolicy="no-referrer"
            onError={() => onTileError(tile.key, tile.url)}
          />
        ))}
      </div>

      {satellite ? (
        <>
          <div className="pointer-events-none absolute inset-0 rounded-full rimvio-globe-satellite-shade" />
          <div className="pointer-events-none absolute inset-0 rounded-full rimvio-globe-atmosphere" />
          <div className="pointer-events-none absolute inset-0 rounded-full rimvio-globe-terminator" />
        </>
      ) : (
        <>
          <div className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle_at_50%_42%,transparent_48%,rgba(242,243,245,0.35)_72%,rgba(235,237,240,0.88)_100%)]" />
          <div className="pointer-events-none absolute inset-0 rounded-full shadow-[inset_0_0_48px_rgba(6,6,7,0.08)]" />
        </>
      )}

      <p
        className={cn(
          "pointer-events-none absolute text-[7px] font-medium",
          satellite ? "bottom-2 right-2 text-white/40" : "bottom-2 right-2 text-foreground/35",
        )}
      >
        {globeMapTileAttribution(tileStyle)}
      </p>
    </div>
  );
});
