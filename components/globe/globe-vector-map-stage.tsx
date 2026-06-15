"use client";

import { memo, useEffect, useRef } from "react";
import type { ClassifiedGlobePin } from "@/lib/feed/experience-globe-ping-types";
import {
  createGlobe3dClusterPinElement,
  createGlobe3dPinElement,
} from "@/lib/globe/create-globe-3d-pin-element";
import { createGlobe3dViewerPinElement } from "@/lib/globe/create-globe-3d-viewer-pin-element";
import { clampGpsAccuracyMeters } from "@/lib/globe/format-gps-accuracy-label";
import {
  GLOBE_VECTOR_MAP_STYLE_URL,
  type GlobeVectorMapView,
} from "@/lib/globe/globe-vector-map-view";
import { applyRimvioVectorMapCanvas } from "@/lib/globe/apply-rimvio-vector-map-canvas";
import { bindGlobeVectorMapResize, syncGlobeVectorMapSize } from "@/lib/globe/sync-globe-vector-map-size";
import type { GlobeViewerLocation } from "@/lib/globe/globe-viewer-location-types";
import { cn } from "@/lib/utils";

function pinMarkerSignature(
  pins: readonly ClassifiedGlobePin[],
  activePinId: string | null,
): string {
  return `${activePinId ?? ""}|${pins.map((pin) => `${pin.id}:${pin.lat}:${pin.lng}`).join(",")}`;
}

export type GlobeVectorMapStageProps = {
  view: GlobeVectorMapView;
  pins: readonly ClassifiedGlobePin[];
  activePinId?: string | null;
  onPinPress?: (pinId: string) => void;
  viewerLocation?: GlobeViewerLocation | null;
  /** Mount tiles + sync camera (includes crossfade phases). */
  active?: boolean;
  /** User gestures — only after crossfade completes. */
  interactive?: boolean;
  onViewChange?: (view: GlobeVectorMapView) => void;
  onExitToGlobe?: () => void;
  /** Empty map tap — dismiss context without zooming out. */
  onBackgroundPress?: (coords: { lat: number; lng: number }) => void;
  className?: string;
};

export const GlobeVectorMapStage = memo(function GlobeVectorMapStage({
  view,
  pins,
  activePinId = null,
  onPinPress,
  viewerLocation = null,
  active = false,
  interactive = false,
  onViewChange,
  onExitToGlobe,
  onBackgroundPress,
  className,
}: GlobeVectorMapStageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("maplibre-gl").Map | null>(null);
  const markersRef = useRef<import("maplibre-gl").Marker[]>([]);
  const styleReadyRef = useRef(false);
  const canvasAppliedRef = useRef(false);
  const activeRef = useRef(active);
  const interactiveRef = useRef(interactive);
  const viewRef = useRef(view);
  const markerSignatureRef = useRef("");
  activeRef.current = active;
  interactiveRef.current = interactive;
  viewRef.current = view;
  const onViewChangeRef = useRef(onViewChange);
  const onExitRef = useRef(onExitToGlobe);
  const onPinPressRef = useRef(onPinPress);
  const onBackgroundPressRef = useRef(onBackgroundPress);
  onViewChangeRef.current = onViewChange;
  onExitRef.current = onExitToGlobe;
  onPinPressRef.current = onPinPress;
  onBackgroundPressRef.current = onBackgroundPress;

  const syncCameraToView = () => {
    const map = mapRef.current;
    const container = containerRef.current;
    if (!map || !container || !activeRef.current) {
      return;
    }
    syncGlobeVectorMapSize(map, container);
    const nextView = viewRef.current;
    map.jumpTo({
      center: [nextView.lng, nextView.lat],
      zoom: nextView.zoom,
      bearing: nextView.bearing,
      pitch: nextView.pitch,
    });
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    let cancelled = false;
    let map: import("maplibre-gl").Map | null = null;
    let unbindResize: (() => void) | null = null;

    const emitView = () => {
      if (!map) {
        return;
      }
      const center = map.getCenter();
      onViewChangeRef.current?.({
        lat: center.lat,
        lng: center.lng,
        zoom: map.getZoom(),
        bearing: map.getBearing(),
        pitch: map.getPitch(),
      });
    };

    void (async () => {
      const maplibregl = (await import("maplibre-gl")).default;
      await import("maplibre-gl/dist/maplibre-gl.css");
      if (cancelled || !containerRef.current) {
        return;
      }

      map = new maplibregl.Map({
        container: containerRef.current,
        style: GLOBE_VECTOR_MAP_STYLE_URL,
        center: [viewRef.current.lng, viewRef.current.lat],
        zoom: viewRef.current.zoom,
        bearing: viewRef.current.bearing,
        pitch: viewRef.current.pitch,
        attributionControl: false,
        maxZoom: 21,
        minZoom: 12,
        fadeDuration: 0,
        refreshExpiredTiles: false,
      });
      mapRef.current = map;
      unbindResize = bindGlobeVectorMapResize(map, containerRef.current);

      map.on("load", () => {
        if (cancelled || !map) {
          return;
        }
        styleReadyRef.current = true;
        if (!canvasAppliedRef.current) {
          applyRimvioVectorMapCanvas(map);
          canvasAppliedRef.current = true;
        }
        if (activeRef.current) {
          syncCameraToView();
        }
      });

      map.on("moveend", () => {
        emitView();
      });
      map.on("click", (event) => {
        if (!interactiveRef.current) {
          return;
        }
        onBackgroundPressRef.current?.({
          lat: event.lngLat.lat,
          lng: event.lngLat.lng,
        });
      });
    })();

    return () => {
      cancelled = true;
      styleReadyRef.current = false;
      unbindResize?.();
      for (const marker of markersRef.current) {
        marker.remove();
      }
      markersRef.current = [];
      markerSignatureRef.current = "";
      map?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!active || !styleReadyRef.current) {
      return;
    }
    syncCameraToView();
  }, [active, view.lat, view.lng, view.zoom, view.bearing, view.pitch]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !active) {
      return;
    }

    const signature = pinMarkerSignature(pins, activePinId);
    if (signature === markerSignatureRef.current) {
      return;
    }
    markerSignatureRef.current = signature;

    void (async () => {
      const maplibregl = (await import("maplibre-gl")).default;

      for (const marker of markersRef.current) {
        marker.remove();
      }
      markersRef.current = [];

      for (const pin of pins) {
        let element: HTMLElement;
        if (pin.pinShape === "viewer") {
          element = createGlobe3dViewerPinElement(
            clampGpsAccuracyMeters(viewerLocation?.accuracyM ?? null),
          );
        } else if (pin.pinShape === "cluster") {
          element = createGlobe3dClusterPinElement(pin, {
            onPress: (pinId) => onPinPressRef.current?.(pinId),
          });
        } else {
          element = createGlobe3dPinElement(
            pin,
            pin.id === activePinId,
            {
              onPress: (pinId) => onPinPressRef.current?.(pinId),
            },
            { relocateEnabled: false },
          );
        }

        const marker = new maplibregl.Marker({ element, anchor: "bottom" })
          .setLngLat([pin.lng, pin.lat])
          .addTo(map);
        markersRef.current.push(marker);
      }
    })();
  }, [pins, activePinId, active, viewerLocation]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "absolute inset-0 z-[2] h-full w-full",
        !interactive && "pointer-events-none",
        className,
      )}
      data-rimvio-globe-vector-map
      data-rimvio-globe-vector-active={active ? "true" : "false"}
      aria-hidden={!active}
    />
  );
});
