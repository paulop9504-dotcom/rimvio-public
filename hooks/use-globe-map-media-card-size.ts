"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  clampGlobeMapMediaCardWidth,
  GLOBE_MAP_MEDIA_CARD_WIDTH_DEFAULT,
  readGlobeMapMediaCardWidth,
  touchPairDistance,
  writeGlobeMapMediaCardWidth,
} from "@/lib/globe/globe-map-media-card-size";

type PinchStart = {
  distance: number;
  width: number;
};

type ResizeStart = {
  y: number;
  width: number;
};

export function useGlobeMapMediaCardSize() {
  const [widthPx, setWidthPxState] = useState(GLOBE_MAP_MEDIA_CARD_WIDTH_DEFAULT);
  const widthRef = useRef(widthPx);
  const pinchStartRef = useRef<PinchStart | null>(null);
  const pinchActiveRef = useRef(false);
  const resizeStartRef = useRef<ResizeStart | null>(null);
  const resizingRef = useRef(false);

  useEffect(() => {
    setWidthPxState(readGlobeMapMediaCardWidth());
  }, []);

  useEffect(() => {
    widthRef.current = widthPx;
  }, [widthPx]);

  const setWidthPx = useCallback((next: number) => {
    const clamped = clampGlobeMapMediaCardWidth(next);
    widthRef.current = clamped;
    setWidthPxState(clamped);
    writeGlobeMapMediaCardWidth(clamped);
  }, []);

  const isResizing = useCallback(() => resizingRef.current, []);

  const onResizeHandlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      resizingRef.current = true;
      resizeStartRef.current = {
        y: event.clientY,
        width: widthRef.current,
      };
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [],
  );

  const onResizeHandlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      if (!resizeStartRef.current) {
        return;
      }
      event.stopPropagation();
      const dy = event.clientY - resizeStartRef.current.y;
      setWidthPx(resizeStartRef.current.width + dy * 1.35);
    },
    [setWidthPx],
  );

  const onResizeHandlePointerUp = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      resizeStartRef.current = null;
      resizingRef.current = false;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    },
    [],
  );

  const onCardTouchStart = useCallback((event: React.TouchEvent) => {
    if (event.touches.length === 2) {
      pinchActiveRef.current = true;
      pinchStartRef.current = {
        distance: touchPairDistance(event.touches[0]!, event.touches[1]!),
        width: widthRef.current,
      };
    }
  }, []);

  const onCardTouchMove = useCallback(
    (event: React.TouchEvent) => {
      const start = pinchStartRef.current;
      if (!start || event.touches.length !== 2) {
        return;
      }
      event.preventDefault();
      const distance = touchPairDistance(event.touches[0]!, event.touches[1]!);
      const ratio = distance / start.distance;
      setWidthPx(start.width * ratio);
    },
    [setWidthPx],
  );

  const onCardTouchEnd = useCallback((event: React.TouchEvent) => {
    if (event.touches.length < 2) {
      pinchStartRef.current = null;
      pinchActiveRef.current = false;
    }
  }, []);

  return {
    widthPx,
    setWidthPx,
    pinchActiveRef,
    isResizing,
    onResizeHandlePointerDown,
    onResizeHandlePointerMove,
    onResizeHandlePointerUp,
    onCardTouchStart,
    onCardTouchMove,
    onCardTouchEnd,
  };
}
