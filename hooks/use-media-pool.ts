"use client";

import { useCallback, useEffect, useState } from "react";
import { MEDIA_SPACETIME_UPDATED } from "@/lib/location-ping/media-context-store";
import { countMediaPoolItems } from "@/lib/media-pool/list-media-pool-items";
import { pruneExpiredMediaPool } from "@/lib/media-pool/prune-expired-media-pool";

export function useMediaPool(enabled = true) {
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setCount(0);
      return;
    }
    await pruneExpiredMediaPool();
    const next = await countMediaPoolItems();
    setCount(next);
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    void refresh();
    const onUpdated = () => {
      void refresh();
    };
    window.addEventListener(MEDIA_SPACETIME_UPDATED, onUpdated);
    return () => window.removeEventListener(MEDIA_SPACETIME_UPDATED, onUpdated);
  }, [enabled, refresh]);

  return { count, refresh };
}
