"use client";

import { useCallback, useRef, useState } from "react";
import {
  panFlatMapView,
  type FlatMapView,
  zoomFlatMapFromPinch,
  zoomFlatMapView,
} from "@/lib/globe/flat-map-view";

const DRAG_THRESHOLD_PX = 6;

type PointerPoint = { x: number; y: number };

type DragSession = {
  pointerId: number;
  startX: number;
  startY: number;
  startView: FlatMapView;
  dragging: boolean;
};

type PinchSession = {
  startDistance: number;
  startZoom: number;
  startView: FlatMapView;
};

export type UseFlatMapTouchOptions = {
  view: FlatMapView;
  onViewChange: (view: FlatMapView) => void;
  /** Fires when drag/pinch ends — use for 3D handoff, not mid-gesture. */
  onGestureEnd?: (view: FlatMapView) => void;
  enabled?: boolean;
};

export type FlatMapTouchSurfaceProps = {
  onPointerDown: (event: React.PointerEvent<HTMLElement>) => void;
  onPointerMove: (event: React.PointerEvent<HTMLElement>) => void;
  onPointerUp: (event: React.PointerEvent<HTMLElement>) => void;
  onPointerCancel: (event: React.PointerEvent<HTMLElement>) => void;
  onWheel: (event: React.WheelEvent<HTMLElement>) => void;
};

export function useFlatMapTouch({
  view,
  onViewChange,
  onGestureEnd,
  enabled = true,
}: UseFlatMapTouchOptions) {
  const viewRef = useRef(view);
  viewRef.current = view;
  const onViewChangeRef = useRef(onViewChange);
  onViewChangeRef.current = onViewChange;
  const onGestureEndRef = useRef(onGestureEnd);
  onGestureEndRef.current = onGestureEnd;
  const [isInteracting, setIsInteracting] = useState(false);
  const dragRef = useRef<DragSession | null>(null);
  const pointersRef = useRef(new Map<number, PointerPoint>());
  const pinchRef = useRef<PinchSession | null>(null);

  const emitView = useCallback((next: FlatMapView) => {
    onViewChangeRef.current(next);
  }, []);

  const pointerDistance = useCallback((points: PointerPoint[]) => {
    if (points.length < 2) {
      return 0;
    }
    const [a, b] = points;
    return Math.hypot(a.x - b.x, a.y - b.y);
  }, []);

  const finishGesture = useCallback(() => {
    const hadSession = Boolean(dragRef.current?.dragging || pinchRef.current);
    dragRef.current = null;
    pinchRef.current = null;
    pointersRef.current.clear();
    setIsInteracting(false);
    if (hadSession) {
      onGestureEndRef.current?.(viewRef.current);
    }
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
        dragRef.current = null;
        pinchRef.current = {
          startDistance: pointerDistance(points),
          startZoom: viewRef.current.zoom,
          startView: viewRef.current,
        };
        setIsInteracting(true);
        event.currentTarget.setPointerCapture(event.pointerId);
        return;
      }

      if (pointersRef.current.size === 1) {
        pinchRef.current = null;
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
        const points = Array.from(pointersRef.current.values());
        emitView(
          zoomFlatMapFromPinch(
            pinchRef.current.startView,
            pinchRef.current.startZoom,
            pinchRef.current.startDistance,
            pointerDistance(points),
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
      setIsInteracting(true);
      emitView(
        panFlatMapView(drag.startView, deltaX, deltaY),
      );
    },
    [emitView, enabled, pointerDistance],
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
        finishGesture();
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
    [finishGesture, enabled],
  );

  const onPointerCancel = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (!enabled) {
        return;
      }
      pointersRef.current.delete(event.pointerId);
      if (pointersRef.current.size === 0) {
        finishGesture();
      }
    },
    [finishGesture, enabled],
  );

  const onWheel = useCallback(
    (event: React.WheelEvent<HTMLElement>) => {
      if (!enabled) {
        return;
      }
      event.preventDefault();
      setIsInteracting(true);
      const factor = event.deltaY < 0 ? 1.1 : 0.9;
      emitView(zoomFlatMapView(viewRef.current, factor));
      window.setTimeout(() => setIsInteracting(false), 180);
    },
    [emitView, enabled],
  );

  const surfaceProps: FlatMapTouchSurfaceProps = {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    onWheel,
  };

  return { isInteracting, surfaceProps };
}
