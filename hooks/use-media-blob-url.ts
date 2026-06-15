"use client";

import { useEffect, useState } from "react";
import { readMediaBlobUrl } from "@/lib/location-ping/media-blob-store";

export function useMediaBlobUrl(contextId: string | null | undefined) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(contextId?.trim()));

  useEffect(() => {
    const key = contextId?.trim();
    if (!key) {
      setUrl(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    void readMediaBlobUrl(key).then((next) => {
      if (cancelled) {
        return;
      }
      setUrl(next);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [contextId]);

  return { url, loading };
}
