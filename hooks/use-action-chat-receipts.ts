"use client";

import { useTrueCostReceipt, shouldShowTrueCostReceipt } from "@/hooks/use-true-cost-receipt";
import { shouldShowTimeReceipt, useTimeReceipt } from "@/hooks/use-time-receipt";
import { useStudyReceipt } from "@/hooks/use-study-receipt";
import { useMarketPrice, shouldShowMarketPrice } from "@/hooks/use-market-price";
import { buildReceiptRailItems, type ReceiptRailItem } from "@/lib/action-chat/build-receipt-rail-items";
import type { LinkRow } from "@/types/database";

export function useActionChatReceipts(input: {
  link: LinkRow;
  enabled: boolean;
  signalLine?: string | null;
  primaryActionLabel?: string | null;
}) {
  const { link, enabled, signalLine, primaryActionLabel } = input;

  const showMarket = shouldShowMarketPrice(link);
  const { snapshot: marketSnapshot, loading: marketLoading } = useMarketPrice(link, enabled && showMarket);

  const showTrueCost = shouldShowTrueCostReceipt(link);
  const trueCostReceipt = useTrueCostReceipt(
    link,
    enabled,
    marketSnapshot?.listingPrice ?? null
  );

  const showTime = shouldShowTimeReceipt(link);
  const { receipt: timeReceipt, loading: timeLoading } = useTimeReceipt(
    link,
    enabled && showTime
  );

  const studyReceipt = useStudyReceipt(link, enabled);

  const items: ReceiptRailItem[] = enabled
    ? buildReceiptRailItems({
        link,
        signalLine,
        primaryActionLabel,
        studyReceipt,
        timeReceipt,
        timeLoading,
        marketSnapshot,
        marketLoading,
        trueCostReceipt,
      })
    : [];

  const loading =
    (showMarket && marketLoading && !marketSnapshot) ||
    (showTime && timeLoading && !timeReceipt) ||
    false;

  return { items, loading };
}
