"use client";



import { memo, useCallback, useEffect, useRef } from "react";

import { GlobeExperienceSlotPin } from "@/components/experience/globe-experience-slot-pin";
import { GlobeEarthSurface } from "@/components/experience/globe-earth-surface";
import { useGlobeIdleSpin } from "@/hooks/use-globe-idle-spin";
import { useGlobeTouchControl } from "@/hooks/use-globe-touch-control";
import { wrapGlobePinX } from "@/lib/experience-graph/shift-globe-view";
import type { GlobeSpaceBlob } from "@/lib/experience-graph/build-globe-space-blobs";
import type { ClassifiedGlobePin } from "@/lib/feed/experience-globe-ping-types";
import { mapPercentToLatLng } from "@/lib/experience-graph/resolve-place-coordinates";
import type { SpatialGlobeView } from "@/lib/experience-graph/spatial-media-types";
import type { GlobeEarthMapVariant } from "@/hooks/use-globe-earth-texture";
import { cn } from "@/lib/utils";

const PIN_KIND_CLASS: Record<ClassifiedGlobePin["kind"], string> = {
  photo: "bg-emerald-300/90 shadow-[0_0_12px_rgba(52,211,153,0.85)]",
  video: "bg-violet-300/90 shadow-[0_0_12px_rgba(167,139,250,0.85)]",
  gps: "bg-sky-400/85 shadow-[0_0_10px_rgba(56,189,248,0.75)]",
  dwell: "bg-amber-300/90 shadow-[0_0_12px_rgba(251,191,36,0.8)]",
  place: "bg-white/75 shadow-[0_0_10px_rgba(255,255,255,0.45)]",
};

const PIN_KIND_CLASS_SATELLITE: Record<ClassifiedGlobePin["kind"], string> = {
  photo: "bg-emerald-400 shadow-[0_0_16px_rgba(52,211,153,1)] ring-2 ring-white/90",
  video: "bg-violet-400 shadow-[0_0_16px_rgba(167,139,250,1)] ring-2 ring-white/90",
  gps: "bg-sky-300 shadow-[0_0_14px_rgba(125,211,252,1)] ring-2 ring-white/85",
  dwell: "bg-amber-300 shadow-[0_0_16px_rgba(251,191,36,1)] ring-2 ring-white/90",
  place: "bg-white shadow-[0_0_14px_rgba(255,255,255,0.9)] ring-2 ring-white/80",
};



export type SpatialGlobeStageProps = {

  globe: SpatialGlobeView;

  timeLabel?: string | null;

  environmentLabel?: string | null;

  blobs?: readonly GlobeSpaceBlob[];

  activeBlobId?: string | null;

  onBlobPress?: (blobId: string) => void;

  classifiedPins?: readonly ClassifiedGlobePin[];

  activePinId?: string | null;

  onPinPress?: (pinId: string) => void;

  /** Tap empty map — shared ROOM globe pin placement. */
  onMapPress?: (coords: { lat: number; lng: number; pinX: number; pinY: number }) => void;

  variant?: "card" | "immersive";

  /** Hide place/time/environment chips — globe-first home. */
  hideSyncMeta?: boolean;

  /** Immersive hub — hide center crosshair when pins carry context. */
  hideCenterCrosshair?: boolean;

  /** Drag to pan, pinch / wheel to zoom. Defaults on for immersive. */
  interactive?: boolean;

  /** Slow 360° longitude spin — Google Earth idle. Defaults on for immersive. */
  autoSpin?: boolean;

  /** `toss` — CARTO light map (room 우리 지구). Default satellite elsewhere. */
  mapVariant?: GlobeEarthMapVariant;

  className?: string;

};



/** Rimvio globe — location, time, and environment stay synced; blobs tappable on immersive hub. */

export const SpatialGlobeStage = memo(function SpatialGlobeStage({

  globe,

  timeLabel,

  environmentLabel,

  blobs = [],

  activeBlobId,

  onBlobPress,

  classifiedPins = [],

  activePinId,

  onPinPress,

  onMapPress,

  variant = "card",

  hideSyncMeta = false,

  hideCenterCrosshair = false,

  interactive: interactiveProp,

  autoSpin: autoSpinProp,

  mapVariant = "satellite",

  className,

}: SpatialGlobeStageProps) {

  const immersive = variant === "immersive";
  const interactive = interactiveProp ?? immersive;
  const autoSpin = autoSpinProp ?? immersive;
  const sphereRef = useRef<HTMLDivElement>(null);

  const {
    view: activeGlobe,
    isInteracting,
    surfaceProps,
    onWheel,
    setSphereDiameterPx,
    shouldConsumeTap,
  } = useGlobeTouchControl({
    baseView: globe,
    enabled: interactive,
    lockZoom: Boolean(activePinId),
  });

  const spinShiftX = useGlobeIdleSpin({
    enabled: autoSpin,
    paused: isInteracting,
  });

  const displayGlobe = interactive ? activeGlobe : globe;
  const translateX = 50 - wrapGlobePinX(displayGlobe.pinX + spinShiftX);
  const translateY = 50 - displayGlobe.pinY;

  const toss = mapVariant === "toss";
  const pinKindClass = toss ? PIN_KIND_CLASS : PIN_KIND_CLASS_SATELLITE;

  const measureSphere = useCallback(() => {
    const rect = sphereRef.current?.getBoundingClientRect();
    if (rect?.width) {
      setSphereDiameterPx(rect.width);
    }
  }, [setSphereDiameterPx]);

  const handleMapPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      measureSphere();
      surfaceProps.onPointerDown(event);
    },
    [measureSphere, surfaceProps],
  );

  useEffect(() => {
    if (!interactive) {
      return;
    }
    const node = sphereRef.current;
    if (!node) {
      return;
    }
    const handleWheel = (event: WheelEvent) => {
      onWheel(event as unknown as React.WheelEvent<HTMLElement>);
    };
    node.addEventListener("wheel", handleWheel, { passive: false });
    return () => node.removeEventListener("wheel", handleWheel);
  }, [interactive, onWheel]);

  const handleMapClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!onMapPress || shouldConsumeTap() || activePinId) {
        return;
      }
      const rect = event.currentTarget.getBoundingClientRect();
      const pinX = ((event.clientX - rect.left) / rect.width) * 100;
      const pinY = ((event.clientY - rect.top) / rect.height) * 100;
      const { lat, lng } = mapPercentToLatLng(pinX, pinY);
      onMapPress({ lat, lng, pinX, pinY });
    },
    [activePinId, onMapPress, shouldConsumeTap],
  );



  const sphereSizeClass = immersive
    ? "size-[min(76vmin,92cqw,480px)]"
    : "size-[min(72vw,340px)]";

  return (

    <div

      className={cn(

        "relative flex min-h-0 flex-col overflow-hidden",

        immersive
          ? cn(
              "h-full min-h-[280px] flex-1 rounded-none border-0 [container-type:inline-size]",
              toss ? "rimvio-globe-space--toss" : "rimvio-globe-space",
            )
          : cn(
              "min-h-[min(36vh,320px)] rounded-2xl shadow-sm",
              toss
                ? "rimvio-globe-space--toss border border-[#0220470f]"
                : "rimvio-globe-space border border-white/10",
            ),

        className,

      )}

      data-spatial-globe-stage

      data-spatial-globe-variant={variant}

      data-spatial-lat={displayGlobe.lat}

      data-spatial-lng={displayGlobe.lng}

      data-spatial-globe-interactive={interactive ? "true" : undefined}

      data-spatial-globe-map={mapVariant}

    >

      {toss ? (
        <div
          className="pointer-events-none absolute inset-0 rimvio-globe-ambient rimvio-globe-ambient--toss"
          aria-hidden
        />
      ) : (
        <div className="pointer-events-none absolute inset-0 rimvio-globe-stars" aria-hidden />
      )}



      <div

        className={cn(

          "relative flex min-h-0 w-full flex-1 items-center justify-center",

          immersive ? "rimvio-globe-home-canvas" : "aspect-[16/10]",

        )}

      >

        <div
          className={cn(
            "relative shrink-0",
            sphereSizeClass,
            interactive
              ? isInteracting
                ? "transition-none"
                : "transition-transform duration-500 ease-out"
              : "transition-transform duration-[1200ms] ease-out",
          )}
          style={{ transform: `scale(${displayGlobe.zoom})` }}
        >
          {immersive ? (
            <div
              className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(56,189,248,0.14)_0%,rgba(37,99,235,0.06)_42%,transparent_72%)]"
              aria-hidden
            />
          ) : null}

          <div

            ref={sphereRef}

            className={cn(

              "absolute inset-0 overflow-hidden rounded-full",

              toss
                ? "border border-[#02204714] bg-[#f2f4f6] shadow-sm"
                : "rimvio-globe-sphere-aura border bg-[#050810]",

              interactive && "rimvio-globe-touch-surface",

              interactive && isInteracting && "rimvio-globe-touch-active",

            )}

            aria-hidden={!interactive}

          >

          <div
            className={cn(
              "absolute inset-0 rounded-full",
              interactive
                ? isInteracting
                  ? "transition-none"
                  : "transition-transform duration-500 ease-out"
                : "transition-transform duration-[1200ms] ease-out",
              onMapPress && !interactive && "cursor-crosshair",
            )}
            style={{
              transform: `translate(${translateX}%, ${translateY}%)`,
            }}
            data-globe-map-surface
            onPointerDown={interactive ? handleMapPointerDown : undefined}
            onPointerMove={interactive ? surfaceProps.onPointerMove : undefined}
            onPointerUp={interactive ? surfaceProps.onPointerUp : undefined}
            onPointerCancel={interactive ? surfaceProps.onPointerCancel : undefined}
            onClick={onMapPress ? handleMapClick : undefined}
          >
            <div className="absolute inset-0 rounded-full">
            <GlobeEarthSurface mapVariant={mapVariant} />

            {blobs.map((blob) => {
              const active = blob.id === activeBlobId;
              const left = `${blob.pinX}%`;
              const top = `${blob.pinY}%`;
              return (
                <button
                  key={blob.id}
                  type="button"
                  className={cn(
                    "absolute z-10 -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-500",
                    active
                      ? "size-4 bg-sky-200 shadow-[0_0_22px_rgba(186,230,253,1)] ring-2 ring-white"
                      : "size-2.5 bg-sky-400/80 shadow-[0_0_12px_rgba(56,189,248,0.8)] hover:size-3.5",
                  )}
                  style={{ left, top }}
                  data-globe-space-blob={blob.id}
                  aria-label={`${blob.label} 경험 ${blob.experienceCount}개`}
                  aria-pressed={active}
                  onClick={(event) => {
                    event.stopPropagation();
                    onBlobPress?.(blob.id);
                  }}
                />
              );
            })}

            {classifiedPins.map((pin) => {
              const active = pin.id === activePinId;
              const related = pin.emphasis === "related";
              const isSlot = pin.pinShape === "slot" && pin.slot;

              if (isSlot) {
                return (
                  <button
                    key={pin.id}
                    type="button"
                    className="absolute z-[12] -translate-x-1/2 -translate-y-full"
                    style={{ left: `${pin.pinX}%`, top: `${pin.pinY}%` }}
                    data-globe-classified-pin={pin.id}
                    data-globe-pin-shape="slot"
                    aria-label={`${pin.slot!.experienceTitle} · 사진 ${pin.slot!.photoCount} · 영상 ${pin.slot!.videoCount}`}
                    aria-pressed={active}
                    onClick={(event) => {
                      event.stopPropagation();
                      onPinPress?.(pin.id);
                    }}
                  >
                    <GlobeExperienceSlotPin
                      slot={pin.slot!}
                      active={active}
                      related={related}
                    />
                  </button>
                );
              }

              return (
                <button
                  key={pin.id}
                  type="button"
                  className={cn(
                    "absolute z-[11] -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-500",
                    related ? "opacity-55" : "opacity-100",
                    active ? "size-3.5 ring-2 ring-white" : "size-2 hover:size-2.5",
                    pinKindClass[pin.kind],
                  )}
                  style={{ left: `${pin.pinX}%`, top: `${pin.pinY}%` }}
                  data-globe-classified-pin={pin.id}
                  data-globe-pin-kind={pin.kind}
                  aria-label={`${pin.label} · ${pin.kind}`}
                  aria-pressed={active}
                  onClick={(event) => {
                    event.stopPropagation();
                    onPinPress?.(pin.id);
                  }}
                />
              );
            })}

            </div>
          </div>

          </div>

        </div>



        {interactive ? (
          <p
            className={cn(
              "pointer-events-none absolute inset-x-0 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-20 mx-auto w-fit rounded-full px-3 py-1 text-[10px] font-medium backdrop-blur-sm transition-opacity duration-300",
              toss
                ? "rimvio-globe-hint--toss"
                : "bg-black/35 text-white/50",
              isInteracting && "opacity-0",
            )}
          >
            드래그 · 핀치 확대 · 자동 회전
          </p>
        ) : null}

        {hideCenterCrosshair ? null : (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">

          <div className="relative translate-y-2">

            <span className="absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold text-foreground ring-1 ring-primary/20">

              {displayGlobe.placeLabel}

            </span>

            <span className="block size-4 rounded-full bg-primary shadow-[0_0_16px_rgba(88,101,242,0.45)] ring-2 ring-white" />

            <span className="absolute left-1/2 top-4 h-10 w-px -translate-x-1/2 bg-gradient-to-b from-primary/70 to-transparent" />

          </div>

        </div>
        )}



      </div>



      {hideSyncMeta ? null : (
      <div

        className={cn(

          "border-t border-border px-3 py-2.5",

          immersive && "bg-white/80 backdrop-blur-sm",

        )}

      >

        <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold">

          <span

            className="rounded-full border border-primary/20 bg-primary/8 px-2 py-0.5 text-foreground"

            data-spatial-sync-place

          >

            📍 {displayGlobe.placeLabel}

          </span>

          {timeLabel ? (

            <span

              className="rounded-full border border-border bg-muted px-2 py-0.5 text-foreground/80 transition-opacity duration-500"

              data-spatial-sync-time

            >

              🕐 {timeLabel}

            </span>

          ) : null}

          {environmentLabel ? (

            <span

              className="rounded-full border border-[var(--rimvio-highlight-green)]/25 bg-[var(--rimvio-highlight-green)]/10 px-2 py-0.5 text-foreground/80 transition-opacity duration-500"

              data-spatial-sync-environment

            >

              🌤 {environmentLabel}

            </span>

          ) : null}

        </div>

      </div>
      )}

    </div>

  );

});


