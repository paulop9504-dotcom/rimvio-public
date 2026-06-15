"use client";

import { useEffect, useState } from "react";
import type { MarketPriceSnapshot } from "@/lib/commerce/market-price";
import { buildProvisionalMarketSnapshot } from "@/lib/commerce/client-market-estimate";
import { isSecondhandDomain } from "@/lib/commerce/commerce-cleaner";
import { isCommerceDomain } from "@/lib/enrichers/url-intelligence";
import { isSampleFeedLink } from "@/lib/onboarding/sample-feed";
import type { LinkRow } from "@/types/database";

export const MARKET_FETCH_CAP_MS = 3000;

const cache = new Map<string, MarketPriceSnapshot>();

function cacheKey(link: LinkRow) {
  return `${link.id}:${link.title}:${link.domain}`;
}

export function shouldShowMarketPrice(link: LinkRow) {
  return (
    link.source_type === "commerce" ||
    isCommerceDomain(link.domain) ||
    isSecondhandDomain(link.domain) ||
    link.category === "shopping"
  );
}

export function useMarketPrice(link: LinkRow, enabled: boolean) {
  const [snapshot, setSnapshot] = useState<MarketPriceSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [provisional, setProvisional] = useState(false);

  useEffect(() => {
    if (!enabled || !shouldShowMarketPrice(link)) {
      return;
    }

    const key = cacheKey(link);
    const cached = cache.get(key);
    if (cached) {
      setSnapshot(cached);
      setProvisional(
        cached.estimateKind === "true_cost_model" ||
          cached.estimateKind === "estimate_band"
      );
      return;
    }

    const instant = buildProvisionalMarketSnapshot({
      title: link.title,
      domain: link.domain,
    });

    if (instant) {
      setSnapshot(instant);
      setProvisional(true);
    }

    if (isSampleFeedLink(link)) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const controller = new AbortController();
    const capTimer = window.setTimeout(() => {
      controller.abort();
    }, MARKET_FETCH_CAP_MS);

    void fetch("/api/commerce/market-price", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: link.title,
        domain: link.domain,
      }),
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          return null;
        }

        return (await response.json()) as MarketPriceSnapshot;
      })
      .then((result) => {
        if (cancelled || !result) {
          return;
        }

        cache.set(key, result);
        setSnapshot(result);
        setProvisional(
          result.estimateKind === "true_cost_model" ||
            result.estimateKind === "estimate_band"
        );
      })
      .catch(() => {
        // Keep provisional snapshot — never blank the card on timeout.
      })
      .finally(() => {
        window.clearTimeout(capTimer);
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
      window.clearTimeout(capTimer);
      controller.abort();
    };
  }, [enabled, link.domain, link.id, link.title]);

  return { snapshot, loading, provisional };
}
