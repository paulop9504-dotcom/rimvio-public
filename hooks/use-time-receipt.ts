"use client";

import { useEffect, useState } from "react";
import { shouldShowTimeReceipt } from "@/lib/media/article-url";
import type { TimeReceipt } from "@/lib/media/time-receipt";
import type { LinkRow } from "@/types/database";

const cache = new Map<string, TimeReceipt>();

function cacheKey(link: LinkRow) {
  return `${link.id}:${link.original_url}:${link.title}`;
}

export { shouldShowTimeReceipt };

export function useTimeReceipt(link: LinkRow, enabled: boolean) {
  const [receipt, setReceipt] = useState<TimeReceipt | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled || !shouldShowTimeReceipt(link)) {
      return;
    }

    const key = cacheKey(link);
    const cached = cache.get(key);
    if (cached) {
      setReceipt(cached);
      return;
    }

    let cancelled = false;
    setLoading(true);

    void fetch("/api/media/time-receipt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: link.original_url,
        title: link.title,
        domain: link.domain,
        source_type: link.source_type,
        category: link.category,
      }),
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) {
          return null;
        }

        return (await response.json()) as TimeReceipt;
      })
      .then((result) => {
        if (cancelled || !result) {
          return;
        }

        cache.set(key, result);
        setReceipt(result);
      })
      .catch(() => {
        // Non-blocking.
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    enabled,
    link.category,
    link.domain,
    link.id,
    link.original_url,
    link.source_type,
    link.title,
  ]);

  return { receipt, loading };
}
