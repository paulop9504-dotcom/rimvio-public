"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  buildGlobeMapTileGrid,
  buildGlobeMapTileUrl,
  globeMapTileAttribution,
} from "@/lib/experience-graph/build-globe-map-tiles";
import type { ClassifiedGlobePin } from "@/lib/feed/experience-globe-ping-types";
import { applyGlobePinUiScale } from "@/lib/globe/apply-globe-pin-ui-scale";
import {
  projectFlatMapPinOffset,
  resolveFlatMapPinUiScale,
  resolveFlatMapTileSlippyZoom,
  resolveFlatMapZoomScale,
  type FlatMapView,
} from "@/lib/globe/flat-map-view";
import type { GlobeViewerLocation } from "@/lib/globe/globe-viewer-location-types";
import { cn } from "@/lib/utils";

function parseTileCoords(url: string) {
  try {
    const parsed = new URL(url, "http://local");
    if (parsed.pathname.endsWith("/api/globe/tile")) {
      const z = Number(parsed.searchParams.get("z"));
      const x = Number(parsed.searchParams.get("x"));
      const y = Number(parsed.searchParams.get("y"));
      const style = parsed.searchParams.get("style")?.trim() || "voyager";
      if (!Number.isFinite(z) || !Number.isFinite(x) || !Number.isFinite(y)) {
        return null;
      }
      return { z, x, y, style: style as "voyager" };
    }
    const match = parsed.pathname.match(/\/(\d+)\/(\d+)\/(\d+)\.png$/);
    if (!match) {
      return null;
    }
    return {
      z: Number(match[1]),
      x: Number(match[2]),
      y: Number(match[3]),
      style: "voyager" as const,
    };
  } catch {
    return null;
  }
}

export type GlobeFlatMapStageProps = {
  view: FlatMapView;
  pins: readonly ClassifiedGlobePin[];
  activePinId?: string | null;
  onPinPress?: (pinId: string) => void;
  viewerLocation?: GlobeViewerLocation | null;
  active?: boolean;
  isInteracting?: boolean;
  className?: string;
};

export const GlobeFlatMapStage = memo(function GlobeFlatMapStage({
  view,
  pins,
  activePinId = null,
  onPinPress,
  viewerLocation = null,
  active = false,
  isInteracting = false,
  className,
}: GlobeFlatMapStageProps) {
  const shellRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState({ width: 360, height: 640 });
  const [fallbackUrls, setFallbackUrls] = useState<Record<string, string>>({});

  const slippyTileZoom = resolveFlatMapTileSlippyZoom(view.zoom);
  const zoomScale = resolveFlatMapZoomScale(view.zoom);
  const pinUiScale = resolveFlatMapPinUiScale(view.zoom);
  const panPxX = view.panPxX ?? 0;
  const panPxY = view.panPxY ?? 0;
  const gridSize = slippyTileZoom <= 13 ? 7 : 5;
  const grid = useMemo(
    () =>
      buildGlobeMapTileGrid(
        view.lat,
        view.lng,
        slippyTileZoom,
        gridSize,
        "voyager",
        "direct",
      ),
    [view.lat, view.lng, slippyTileZoom, gridSize],
  );

  useEffect(() => {
    setFallbackUrls({});
  }, [slippyTileZoom]);

  const measureViewport = useCallback(() => {
    const rect = shellRef.current?.getBoundingClientRect();
    if (rect && rect.width > 0 && rect.height > 0) {
      setViewport({ width: rect.width, height: rect.height });
    }
  }, []);

  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) {
      return;
    }
    measureViewport();
    const observer = new ResizeObserver(() => measureViewport());
    observer.observe(shell);
    return () => observer.disconnect();
  }, [measureViewport]);

  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) {
      return;
    }
    applyGlobePinUiScale(shell, pinUiScale);
  }, [pinUiScale, pins]);

  const onTileError = useCallback((tileKey: string, failedUrl: string) => {
    const coords = parseTileCoords(failedUrl);
    if (!coords) {
      return;
    }
    const failedWasDirect = failedUrl.includes("cartocdn.com");
    const fallback = buildGlobeMapTileUrl(
      coords.z,
      coords.x,
      coords.y,
      coords.style,
      failedWasDirect ? "proxy" : "direct",
    );
    setFallbackUrls((prev) =>
      prev[tileKey] === fallback ? prev : { ...prev, [tileKey]: fallback },
    );
  }, []);

  const pinPositions = useMemo(
    () =>
      pins.map((pin) => ({
        pin,
        pos: projectFlatMapPinOffset(
          view,
          pin.lat,
          pin.lng,
          viewport.width,
          viewport.height,
        ),
      })),
    [pins, view, viewport.height, viewport.width],
  );

  return (
    <div
      ref={shellRef}
      className={cn(
        "absolute inset-0 touch-none overflow-hidden bg-[#eef1f4]",
        className,
      )}
      data-rimvio-globe-flat-map
      data-rimvio-globe-flat-active={active ? "true" : "false"}
      style={{ ["--globe-pin-scale" as string]: String(pinUiScale) }}
    >
      <div
        className={cn(
          "absolute left-1/2 top-1/2 grid",
          gridSize === 7 ? "grid-cols-7 grid-rows-7" : "grid-cols-5 grid-rows-5",
        )}
        style={{
          width: grid.gridPx,
          height: grid.gridPx,
          transformOrigin: `${grid.focalOffsetX}px ${grid.focalOffsetY}px`,
          transform: `translate(calc(-${grid.focalOffsetX}px + ${panPxX}px), calc(-${grid.focalOffsetY}px + ${panPxY}px)) scale(${zoomScale})`,
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
            className="block size-full object-cover contrast-[1.14] saturate-[1.12] brightness-[1.04]"
            loading="eager"
            decoding="async"
            draggable={false}
            referrerPolicy="no-referrer"
            onError={(event) => onTileError(tile.key, event.currentTarget.src)}
          />
        ))}
      </div>

      {pinPositions.map(({ pin, pos }) => {
        if (
          pos.x < -80 ||
          pos.y < -80 ||
          pos.x > viewport.width + 80 ||
          pos.y > viewport.height + 80
        ) {
          return null;
        }
        if (pin.pinShape === "viewer") {
          return (
            <div
              key={pin.id}
              className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-1/2"
              style={{ left: pos.x, top: pos.y }}
            >
              <span className="block size-3 rounded-full border-2 border-white bg-[#3182f6] shadow-[0_2px_8px_rgba(49,130,246,0.45)]" />
              <span className="absolute left-1/2 top-1/2 size-8 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#3182f6]/15" />
            </div>
          );
        }
        return (
          <button
            key={pin.id}
            type="button"
            className={cn(
              "rimvio-globe-3d-pin absolute z-20",
              pin.id === activePinId && "rimvio-globe-3d-pin--active",
            )}
            style={{ left: pos.x, top: pos.y }}
            onClick={() => onPinPress?.(pin.id)}
          >
            <span className="rimvio-globe-3d-pin__card">
              <span className="rimvio-globe-3d-pin__title">{pin.label}</span>
            </span>
            <span className="rimvio-globe-3d-pin__dot" />
          </button>
        );
      })}

      {active ? (
        <p className="pointer-events-none absolute inset-x-0 bottom-[max(3.25rem,env(safe-area-inset-bottom))] z-10 mx-auto w-fit rounded-full rimvio-globe-hint--toss px-3.5 py-1.5 text-[11px] font-medium backdrop-blur-md">
          드래그 이동 · 핀치로 거리 확대
        </p>
      ) : null}

      <p className="pointer-events-none absolute bottom-1 right-2 text-[7px] font-medium text-[#8b95a1]/80">
        {globeMapTileAttribution("voyager")}
      </p>
    </div>
  );
});
