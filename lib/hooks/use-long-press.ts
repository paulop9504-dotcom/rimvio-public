"use client";

import { useCallback, useRef } from "react";

const DEFAULT_MS = 520;

export function useLongPress(input: {
  onLongPress: () => void;
  onTap?: () => void;
  delayMs?: number;
}) {
  const timerRef = useRef<number | null>(null);
  const longFiredRef = useRef(false);

  const clear = useCallback(() => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const onPointerDown = useCallback(() => {
    longFiredRef.current = false;
    clear();
    timerRef.current = window.setTimeout(() => {
      longFiredRef.current = true;
      input.onLongPress();
    }, input.delayMs ?? DEFAULT_MS);
  }, [clear, input]);

  const onPointerUp = useCallback(() => {
    clear();
  }, [clear]);

  const onClick = useCallback(
    (event: { preventDefault: () => void; stopPropagation: () => void }) => {
      if (longFiredRef.current) {
        event.preventDefault();
        event.stopPropagation();
        longFiredRef.current = false;
        return;
      }
      input.onTap?.();
    },
    [input],
  );

  return { onPointerDown, onPointerUp, onPointerCancel: onPointerUp, onClick };
}
