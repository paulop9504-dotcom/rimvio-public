"use client";

import { useCallback, useEffect, useRef } from "react";

export function useVisibleDwell(active: boolean) {
  const ref = useRef<HTMLDivElement | null>(null);
  const shownAtRef = useRef<number | null>(null);
  const dwellMsRef = useRef(0);
  const visibleSinceRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active) {
      visibleSinceRef.current = null;
      return;
    }

    shownAtRef.current = shownAtRef.current ?? Date.now();
    const node = ref.current;
    if (!node) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        const now = Date.now();
        if (entry.isIntersecting) {
          if (visibleSinceRef.current === null) {
            visibleSinceRef.current = now;
          }
          return;
        }

        if (visibleSinceRef.current !== null) {
          dwellMsRef.current += now - visibleSinceRef.current;
          visibleSinceRef.current = null;
        }
      },
      { threshold: 0.45 }
    );

    observer.observe(node);
    return () => {
      observer.disconnect();
      if (visibleSinceRef.current !== null) {
        dwellMsRef.current += Date.now() - visibleSinceRef.current;
        visibleSinceRef.current = null;
      }
    };
  }, [active]);

  const getDwellMs = useCallback(() => {
    let total = dwellMsRef.current;
    if (visibleSinceRef.current !== null) {
      total += Date.now() - visibleSinceRef.current;
    }
    return total;
  }, []);

  const getTimeToActionMs = useCallback(() => {
    if (!shownAtRef.current) {
      return null;
    }
    return Date.now() - shownAtRef.current;
  }, []);

  return { ref, getDwellMs, getTimeToActionMs };
}
