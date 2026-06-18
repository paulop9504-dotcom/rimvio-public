"use client";

import { useEffect, useRef, type RefObject } from "react";
import type { GlobeInstance } from "globe.gl";
import { createGestureUpdateCoalescer } from "@/lib/globe/coalesce-gesture-updates";
import {
  altitudeFromPinchDistance,
  applyGlobeFocalZoom,
  resolveGlobeCenterAnchorCoords,
  resolveGlobeScreenCenterClient,
} from "@/lib/globe/globe-focal-pinch-zoom";
import { isTouchZoomDevice } from "@/lib/globe/is-touch-zoom-device";
import {
  releaseOrbitControlsGesture,
  restoreOrbitControlsGesture,
} from "@/lib/globe/release-orbit-controls-gesture";

type PointerPoint = { x: number; y: number };

type PinchSession = {
  startDistance: number;
  startAltitude: number;
  anchorLat: number;
  anchorLng: number;
};

export type UseGlobeFocalPinchOptions = {
  /** Outer shell — captures pointers over pins + canvas (not just WebGL div). */
  shellRef: RefObject<HTMLElement | null>;
  rootRef: RefObject<HTMLElement | null>;
  globeRef: RefObject<GlobeInstance | null>;
  enabled?: boolean;
  controlsBlockedRef?: RefObject<boolean>;
  onInteractingChange?: (active: boolean) => void;
  /** Sync warmth · pin scale · detail level after manual POV writes. */
  onAfterFocalZoom?: (pov: {
    lat: number;
    lng: number;
    altitude: number;
  }) => void;
};

/** Mobile two-finger zoom — touch-first (iOS WebView safe), screen-center anchor. */
export function useGlobeFocalPinch({
  shellRef,
  rootRef,
  globeRef,
  enabled = true,
  controlsBlockedRef,
  onInteractingChange,
  onAfterFocalZoom,
}: UseGlobeFocalPinchOptions) {
  const onAfterFocalZoomRef = useRef(onAfterFocalZoom);
  onAfterFocalZoomRef.current = onAfterFocalZoom;

  useEffect(() => {
    const shell = shellRef.current;
    const root = rootRef.current;
    if (!shell || !root || !enabled || !isTouchZoomDevice()) {
      return;
    }

    const pointers = new Map<number, PointerPoint>();
    let session: PinchSession | null = null;
    let pinchActive = false;
    /** Avoid pointer + touch double-handling on iOS/Android. */
    let touchPinchLane = false;

    const notifyPovSync = () => {
      const globe = globeRef.current;
      if (!globe) {
        return;
      }
      const pov = globe.pointOfView();
      onAfterFocalZoomRef.current?.({
        lat: pov.lat,
        lng: pov.lng,
        altitude: pov.altitude,
      });
    };

    const zoomCoalescer = createGestureUpdateCoalescer<{
      altitude: number;
    }>((payload) => {
      const globe = globeRef.current;
      if (!globe || !session) {
        return;
      }
      try {
        const center = resolveGlobeScreenCenterClient(root);
        applyGlobeFocalZoom({
          globe,
          root,
          anchorLat: session.anchorLat,
          anchorLng: session.anchorLng,
          focalClientX: center.clientX,
          focalClientY: center.clientY,
          nextAltitude: payload.altitude,
        });
        notifyPovSync();
      } catch {
        endPinch();
      }
    });

    const pointerDistance = () => {
      const points = Array.from(pointers.values());
      if (points.length < 2) {
        return 0;
      }
      const [a, b] = points;
      return Math.hypot(a.x - b.x, a.y - b.y);
    };

    const restoreControls = () => {
      const globe = globeRef.current;
      if (!globe || controlsBlockedRef?.current) {
        return;
      }
      restoreOrbitControlsGesture(globe.controls(), {
        enableRotate: true,
        enableZoom: true,
      });
      globe.controls().enabled = true;
    };

    const beginPinch = () => {
      const globe = globeRef.current;
      if (!globe || session) {
        return;
      }
      const distance = pointerDistance();
      if (distance < 8) {
        return;
      }
      const anchor = resolveGlobeCenterAnchorCoords(globe, root);
      const pov = globe.pointOfView();
      session = {
        startDistance: distance,
        startAltitude: pov.altitude,
        anchorLat: anchor.lat,
        anchorLng: anchor.lng,
      };
      pinchActive = true;
      globe.controls().enabled = false;
      releaseOrbitControlsGesture(globe.controls());
      onInteractingChange?.(true);
    };

    const endPinch = () => {
      if (!session && !pinchActive) {
        touchPinchLane = false;
        return;
      }
      session = null;
      pinchActive = false;
      touchPinchLane = false;
      zoomCoalescer.flushNow();
      notifyPovSync();
      restoreControls();
      onInteractingChange?.(false);
    };

    const syncPointer = (event: PointerEvent) => {
      if (event.pointerType === "mouse") {
        return;
      }
      pointers.set(event.pointerId, {
        x: event.clientX,
        y: event.clientY,
      });
    };

    const removePointer = (event: PointerEvent) => {
      pointers.delete(event.pointerId);
    };

    const onPointerDown = (event: PointerEvent) => {
      if (touchPinchLane || event.pointerType === "mouse") {
        return;
      }
      syncPointer(event);
      if (pointers.size >= 2) {
        event.preventDefault();
        event.stopPropagation();
        beginPinch();
      }
    };

    const onPointerMove = (event: PointerEvent) => {
      if (touchPinchLane || event.pointerType === "mouse") {
        return;
      }
      syncPointer(event);

      if (!session && pointers.size >= 2) {
        event.preventDefault();
        event.stopPropagation();
        beginPinch();
      }

      if (!session || pointers.size < 2) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      zoomCoalescer.push({
        altitude: altitudeFromPinchDistance(
          session.startAltitude,
          session.startDistance,
          pointerDistance(),
        ),
      });
    };

    const onPointerUp = (event: PointerEvent) => {
      if (touchPinchLane) {
        return;
      }
      removePointer(event);
      if (pointers.size < 2) {
        endPinch();
      }
    };

    const onPointerCancel = (event: PointerEvent) => {
      if (touchPinchLane) {
        return;
      }
      removePointer(event);
      if (pointers.size < 2) {
        endPinch();
      }
    };

    const touchDistance = (list: TouchList) => {
      if (list.length < 2) {
        return 0;
      }
      const a = list[0]!;
      const b = list[1]!;
      return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    };

    const syncTouches = (list: TouchList) => {
      pointers.clear();
      for (let i = 0; i < list.length; i += 1) {
        const touch = list[i]!;
        pointers.set(touch.identifier, {
          x: touch.clientX,
          y: touch.clientY,
        });
      }
    };

    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length >= 2) {
        touchPinchLane = true;
        syncTouches(event.touches);
        event.preventDefault();
        event.stopPropagation();
        beginPinch();
      }
    };

    const onTouchMove = (event: TouchEvent) => {
      if (!touchPinchLane && event.touches.length < 2) {
        return;
      }
      if (event.touches.length >= 2) {
        touchPinchLane = true;
      }
      syncTouches(event.touches);
      if (!session && event.touches.length >= 2) {
        event.preventDefault();
        event.stopPropagation();
        beginPinch();
      }
      if (!session || event.touches.length < 2) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      zoomCoalescer.push({
        altitude: altitudeFromPinchDistance(
          session.startAltitude,
          session.startDistance,
          touchDistance(event.touches),
        ),
      });
    };

    const onTouchEnd = (event: TouchEvent) => {
      if (!touchPinchLane) {
        return;
      }
      syncTouches(event.touches);
      if (event.touches.length < 2) {
        endPinch();
      }
    };

    shell.addEventListener("touchstart", onTouchStart, { capture: true, passive: false });
    shell.addEventListener("touchmove", onTouchMove, { capture: true, passive: false });
    shell.addEventListener("touchend", onTouchEnd, { capture: true, passive: false });
    shell.addEventListener("touchcancel", onTouchEnd, { capture: true, passive: false });
    shell.addEventListener("pointerdown", onPointerDown, { capture: true, passive: false });
    shell.addEventListener("pointermove", onPointerMove, { capture: true, passive: false });
    shell.addEventListener("pointerup", onPointerUp, { capture: true });
    shell.addEventListener("pointercancel", onPointerCancel, { capture: true });

    return () => {
      zoomCoalescer.cancel();
      pointers.clear();
      endPinch();
      shell.removeEventListener("touchstart", onTouchStart, { capture: true });
      shell.removeEventListener("touchmove", onTouchMove, { capture: true });
      shell.removeEventListener("touchend", onTouchEnd, { capture: true });
      shell.removeEventListener("touchcancel", onTouchEnd, { capture: true });
      shell.removeEventListener("pointerdown", onPointerDown, { capture: true });
      shell.removeEventListener("pointermove", onPointerMove, { capture: true });
      shell.removeEventListener("pointerup", onPointerUp, { capture: true });
      shell.removeEventListener("pointercancel", onPointerCancel, { capture: true });
    };
  }, [controlsBlockedRef, enabled, globeRef, onInteractingChange, rootRef, shellRef]);
}
