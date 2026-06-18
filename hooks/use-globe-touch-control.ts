"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  clampGlobeZoom,
  shiftGlobeByPixelDelta,
  zoomGlobeFromPinch,
  zoomGlobeView,
} from "@/lib/experience-graph/shift-globe-view";
import type { SpatialGlobeView } from "@/lib/experience-graph/spatial-media-types";
import { createGestureUpdateCoalescer } from "@/lib/globe/coalesce-gesture-updates";

const DRAG_THRESHOLD_PX = 6;

type PointerPoint = { x: number; y: number };

type DragSession = {
  pointerId: number;
  startX: number;
  startY: number;
  startView: SpatialGlobeView;
  dragging: boolean;
};

type PinchSession = {
  startDistance: number;
  startZoom: number;
  startView: SpatialGlobeView;
};

export type UseGlobeTouchControlOptions = {
  baseView: SpatialGlobeView;
  enabled?: boolean;
  /** Pin focused — block wheel/pinch zoom so the view does not snap back. */
  lockZoom?: boolean;
};

export type GlobeTouchSurfaceProps = {
  onPointerDown: (event: React.PointerEvent<HTMLElement>) => void;
  onPointerMove: (event: React.PointerEvent<HTMLElement>) => void;
  onPointerUp: (event: React.PointerEvent<HTMLElement>) => void;
  onPointerCancel: (event: React.PointerEvent<HTMLElement>) => void;
  onWheel: (event: React.WheelEvent<HTMLElement>) => void;
};

export function useGlobeTouchControl({
  baseView,
  enabled = true,
  lockZoom = false,
}: UseGlobeTouchControlOptions) {
  const [view, setView] = useState(baseView);
  const viewRef = useRef(view);
  viewRef.current = view;
  const lockZoomRef = useRef(lockZoom);
  lockZoomRef.current = lockZoom;
  const [isInteracting, setIsInteracting] = useState(false);
  const userAdjustedRef = useRef(false);
  const spherePxRef = useRef(400);
  const dragRef = useRef<DragSession | null>(null);
  const pointersRef = useRef(new Map<number, PointerPoint>());
  const pinchRef = useRef<PinchSession | null>(null);
  const consumedTapRef = useRef(false);
  const viewCoalescerRef = useRef(
    createGestureUpdateCoalescer<SpatialGlobeView>(setView),
  );

  useEffect(() => {
    if (!userAdjustedRef.current) {
      setView(baseView);
    }
  }, [baseView]);

  const setSphereDiameterPx = useCallback((px: number) => {
    if (Number.isFinite(px) && px > 0) {
      spherePxRef.current = px;
    }
  }, []);

  const resetView = useCallback(() => {
    userAdjustedRef.current = false;
    setView(baseView);
    setIsInteracting(false);
  }, [baseView]);

  const pointerDistance = useCallback((points: PointerPoint[]) => {
    if (points.length < 2) {
      return 0;
    }
    const [a, b] = points;
    return Math.hypot(a.x - b.x, a.y - b.y);
  }, []);

  const clearPointerSession = useCallback(() => {
    dragRef.current = null;
    pinchRef.current = null;
    pointersRef.current.clear();
    setIsInteracting(false);
  }, []);

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (!enabled) {
        return;
      }
      if (event.pointerType === "mouse" && event.button !== 0) {
        return;
      }

      pointersRef.current.set(event.pointerId, {
        x: event.clientX,
        y: event.clientY,
      });

      if (pointersRef.current.size === 2) {
        const points = Array.from(pointersRef.current.values());
        const distance = pointerDistance(points);
        dragRef.current = null;
        const snapshot = viewRef.current;
        pinchRef.current = {
          startDistance: distance,
          startZoom: snapshot.zoom,
          startView: snapshot,
        };
        setIsInteracting(true);
        event.currentTarget.setPointerCapture(event.pointerId);
        return;
      }

      if (pointersRef.current.size === 1) {
        pinchRef.current = null;
        consumedTapRef.current = false;
        dragRef.current = {
          pointerId: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          startView: viewRef.current,
          dragging: false,
        };
        event.currentTarget.setPointerCapture(event.pointerId);
      }
    },
    [enabled, pointerDistance],
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (!enabled) {
        return;
      }

      if (pointersRef.current.has(event.pointerId)) {
        pointersRef.current.set(event.pointerId, {
          x: event.clientX,
          y: event.clientY,
        });
      }

      if (pointersRef.current.size >= 2 && pinchRef.current) {
        if (lockZoomRef.current) {
          return;
        }
        const points = Array.from(pointersRef.current.values());
        const distance = pointerDistance(points);
        consumedTapRef.current = true;
        userAdjustedRef.current = true;
        viewCoalescerRef.current.push(
          zoomGlobeFromPinch(
            pinchRef.current.startView,
            pinchRef.current.startZoom,
            pinchRef.current.startDistance,
            distance,
          ),
        );
        setIsInteracting(true);
        return;
      }

      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) {
        return;
      }

      const deltaX = event.clientX - drag.startX;
      const deltaY = event.clientY - drag.startY;
      if (!drag.dragging && Math.hypot(deltaX, deltaY) < DRAG_THRESHOLD_PX) {
        return;
      }

      drag.dragging = true;
      consumedTapRef.current = true;
      userAdjustedRef.current = true;
      setIsInteracting(true);
      viewCoalescerRef.current.push(
        shiftGlobeByPixelDelta(
          drag.startView,
          deltaX,
          deltaY,
          spherePxRef.current,
        ),
      );
    },
    [enabled, pointerDistance],
  );

  const onPointerUp = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (!enabled) {
        return;
      }

      pointersRef.current.delete(event.pointerId);
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }

      if (pointersRef.current.size === 0) {
        viewCoalescerRef.current.flushNow();
        clearPointerSession();
        return;
      }

      if (pointersRef.current.size === 1) {
        pinchRef.current = null;
        const remaining = Array.from(pointersRef.current.entries())[0];
        if (remaining) {
          const [pointerId, point] = remaining;
          dragRef.current = {
            pointerId,
            startX: point.x,
            startY: point.y,
            startView: viewRef.current,
            dragging: false,
          };
        }
      }
    },
    [clearPointerSession, enabled],
  );

  const onPointerCancel = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (!enabled) {
        return;
      }
      pointersRef.current.delete(event.pointerId);
      if (pointersRef.current.size === 0) {
        clearPointerSession();
      }
    },
    [clearPointerSession, enabled],
  );

  const onWheel = useCallback(
    (event: React.WheelEvent<HTMLElement>) => {
      if (!enabled || lockZoomRef.current) {
        return;
      }
      event.preventDefault();
      userAdjustedRef.current = true;
      setIsInteracting(true);
      const factor = event.deltaY < 0 ? 1.1 : 0.9;
      setView((current) => zoomGlobeView(current, factor));
      window.setTimeout(() => setIsInteracting(false), 180);
    },
    [enabled],
  );

  const shouldConsumeTap = useCallback(() => consumedTapRef.current, []);

  const surfaceProps: GlobeTouchSurfaceProps = {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    onWheel,
  };

  return {
    view,
    isInteracting,
    surfaceProps,
    onWheel,
    setSphereDiameterPx,
    resetView,
    shouldConsumeTap,
    clampGlobeZoom,
  };
}
