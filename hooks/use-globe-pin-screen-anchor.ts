"use client";

import { useEffect, useState, type RefObject } from "react";
import type { RimvioGlobeHubHandle } from "@/components/experience/rimvio-globe-hub";
import {
  resolveGlobeContextVideoScreenLayout,
  type GlobeContextVideoScreenLayout,
} from "@/lib/globe/resolve-globe-context-video-layout";

const ANCHOR_FRAME_MS = 66; // ~15 fps — enough for pin-anchored video overlay

function layoutEqual(
  left: GlobeContextVideoScreenLayout | null,
  right: GlobeContextVideoScreenLayout | null,
): boolean {
  if (left === right) {
    return true;
  }
  if (!left || !right) {
    return false;
  }
  return (
    left.x === right.x &&
    left.y === right.y &&
    left.scale === right.scale &&
    left.widthPx === right.widthPx &&
    left.onScreen === right.onScreen
  );
}

export function useGlobePinScreenAnchor(input: {
  globeRef: RefObject<RimvioGlobeHubHandle | null>;
  lat: number | null | undefined;
  lng: number | null | undefined;
  enabled?: boolean;
  containerRef?: RefObject<HTMLElement | null>;
}): GlobeContextVideoScreenLayout | null {
  const [layout, setLayout] = useState<GlobeContextVideoScreenLayout | null>(
    null,
  );
  const lat = input.lat;
  const lng = input.lng;
  const enabled = input.enabled !== false;

  useEffect(() => {
    if (
      !enabled ||
      lat == null ||
      lng == null ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lng)
    ) {
      setLayout(null);
      return;
    }

    let cancelled = false;
    let lastLayout: GlobeContextVideoScreenLayout | null = null;

    const tick = () => {
      const globe = input.globeRef.current;
      const container = input.containerRef?.current;
      const viewportWidth = container?.clientWidth ?? window.innerWidth;
      const viewportHeight = container?.clientHeight ?? window.innerHeight;
      const screen = globe?.getScreenCoords(lat, lng) ?? null;
      const altitude = globe?.getPointOfView()?.altitude ?? null;
      if (cancelled) {
        return;
      }
      const next = resolveGlobeContextVideoScreenLayout({
        screen,
        altitude,
        viewportWidth,
        viewportHeight,
      });
      if (!layoutEqual(lastLayout, next)) {
        lastLayout = next;
        setLayout(next);
      }
    };

    tick();
    const intervalId = window.setInterval(tick, ANCHOR_FRAME_MS);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [enabled, lat, lng, input.globeRef, input.containerRef]);

  return layout;
}
