"use client";

import { useEffect, useState } from "react";
import type { RelatedLinkPreview } from "@/lib/links/discover-related-links";
import type { LinkRow } from "@/types/database";

const SESSION_PREFIX = "rimvio:related:";

function cacheKey(link: LinkRow) {
  return `${SESSION_PREFIX}${link.original_url}`;
}

function readSessionCache(link: LinkRow): RelatedLinkPreview[] | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = sessionStorage.getItem(cacheKey(link));
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as RelatedLinkPreview[];
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function writeSessionCache(link: LinkRow, items: RelatedLinkPreview[]) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    sessionStorage.setItem(cacheKey(link), JSON.stringify(items));
  } catch {
    // Best-effort only.
  }
}

export function usePageRelatedLinks(link: LinkRow, enabled: boolean) {
  const [links, setLinks] = useState<RelatedLinkPreview[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const cached = readSessionCache(link);
    if (cached) {
      setLinks(cached);
      return;
    }

    const controller = new AbortController();
    setLoading(true);

    const params = new URLSearchParams({
      url: link.original_url,
      title: link.title,
      domain: link.domain,
    });

    if (link.category) {
      params.set("category", link.category);
    }

    if (link.source_type) {
      params.set("source_type", link.source_type);
    }

    void fetch(`/api/scrape/related?${params.toString()}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          return { links: [] as RelatedLinkPreview[] };
        }

        return (await response.json()) as { links?: RelatedLinkPreview[] };
      })
      .then((payload) => {
        const next = payload.links ?? [];
        setLinks(next);
        writeSessionCache(link, next);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setLinks([]);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [
    enabled,
    link.category,
    link.domain,
    link.id,
    link.original_url,
    link.source_type,
    link.title,
  ]);

  return { links, loading };
}
