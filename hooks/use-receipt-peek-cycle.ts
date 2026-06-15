"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const SHOW_DELAY_MS = 650;
const VISIBLE_MS = 4_800;

/** Brief receipt peek — appears with action alarm, auto-dismisses. */
export function useReceiptPeekCycle(
  active: boolean,
  enabled: boolean,
  resetKey?: string | number
) {
  const [visible, setVisible] = useState(false);
  const dismissRef = useRef<() => void>(() => {});

  dismissRef.current = () => setVisible(false);

  useEffect(() => {
    if (!active || !enabled) {
      setVisible(false);
      return;
    }

    const showTimer = window.setTimeout(() => setVisible(true), SHOW_DELAY_MS);
    const hideTimer = window.setTimeout(
      () => setVisible(false),
      SHOW_DELAY_MS + VISIBLE_MS
    );

    return () => {
      window.clearTimeout(showTimer);
      window.clearTimeout(hideTimer);
    };
  }, [active, enabled, resetKey]);

  const dismiss = useCallback(() => {
    dismissRef.current();
  }, []);

  return { visible, dismiss };
}
