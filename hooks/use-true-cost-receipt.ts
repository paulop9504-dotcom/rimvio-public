"use client";

import { useMemo } from "react";
import { isSecondhandDomain } from "@/lib/commerce/commerce-cleaner";
import { isTechListingTitle } from "@/lib/commerce/tech-category";
import { buildTrueCostReceipt } from "@/lib/commerce/true-cost-receipt";
import { isCommerceDomain } from "@/lib/enrichers/url-intelligence";
import type { LinkRow } from "@/types/database";

export function shouldShowTrueCostReceipt(link: LinkRow) {
  const commerceLike =
    link.source_type === "commerce" ||
    link.category === "shopping" ||
    isCommerceDomain(link.domain) ||
    isSecondhandDomain(link.domain);

  return commerceLike && isTechListingTitle(link.title, link.domain);
}

export function useTrueCostReceipt(
  link: LinkRow,
  enabled: boolean,
  listingPrice?: number | null
) {
  return useMemo(() => {
    if (!enabled || !shouldShowTrueCostReceipt(link)) {
      return null;
    }

    return buildTrueCostReceipt({
      title: link.title,
      domain: link.domain,
      surfacePrice: listingPrice ?? undefined,
    });
  }, [enabled, link.domain, link.title, listingPrice]);
}
