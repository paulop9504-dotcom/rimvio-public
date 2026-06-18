import { parseSpendReceiptPreview } from "@/lib/action-chat/parse-spend-receipt";
import { shouldShowUnifiedCommerceReceipt } from "@/lib/commerce/unified-commerce-receipt";
import { resolveFeedCardInsight } from "@/lib/feed/resolve-feed-card-panel";
import { resolveReceiptPeekKind } from "@/lib/feed/resolve-receipt-peek";
import type { MarketPriceSnapshot } from "@/lib/commerce/market-price";
import type { TimeReceipt } from "@/lib/media/time-receipt";
import type { TrueCostReceipt } from "@/lib/commerce/true-cost-receipt";
import type { StudyReceipt } from "@/lib/study/build-study-receipt";
import type { LinkRow } from "@/types/database";

export type ReceiptRailItem =
  | { kind: "spend"; merchant: string; amountWon: number | null; headline: string }
  | { kind: "study"; receipt: StudyReceipt }
  | { kind: "time"; receipt: TimeReceipt | null; loading?: boolean }
  | {
      kind: "commerce";
      market: MarketPriceSnapshot | null;
      trueCost: TrueCostReceipt | null;
      marketLoading?: boolean;
      linkId: string;
    }
  | { kind: "save"; link: LinkRow; primaryActionLabel?: string | null; signalLine?: string | null };

const MAX_RAIL_ITEMS = 3;

function isRailItemVisible(item: ReceiptRailItem) {
  switch (item.kind) {
    case "spend":
    case "save":
      return true;
    case "study":
      return Boolean(item.receipt.available);
    case "time":
      return Boolean(item.loading || item.receipt?.available);
    case "commerce":
      return shouldShowUnifiedCommerceReceipt({
        market: item.market,
        trueCost: item.trueCost,
        marketLoading: item.marketLoading,
      });
    default:
      return false;
  }
}

export function buildReceiptRailItems(input: {
  link: LinkRow;
  signalLine?: string | null;
  primaryActionLabel?: string | null;
  studyReceipt?: StudyReceipt | null;
  timeReceipt?: TimeReceipt | null;
  timeLoading?: boolean;
  marketSnapshot?: MarketPriceSnapshot | null;
  marketLoading?: boolean;
  trueCostReceipt?: TrueCostReceipt | null;
}): ReceiptRailItem[] {
  const candidates: ReceiptRailItem[] = [];

  const spend = parseSpendReceiptPreview({
    signal: input.signalLine,
    title: input.link.title,
  });
  if (spend) {
    candidates.push({
      kind: "spend",
      merchant: spend.merchant,
      amountWon: spend.amountWon,
      headline: spend.headline,
    });
  }

  if (input.studyReceipt?.available) {
    candidates.push({ kind: "study", receipt: input.studyReceipt });
  }

  if (input.timeLoading || input.timeReceipt?.available) {
    candidates.push({
      kind: "time",
      receipt: input.timeReceipt ?? null,
      loading: input.timeLoading,
    });
  }

  if (
    shouldShowUnifiedCommerceReceipt({
      market: input.marketSnapshot,
      trueCost: input.trueCostReceipt,
      marketLoading: input.marketLoading,
    })
  ) {
    candidates.push({
      kind: "commerce",
      market: input.marketSnapshot ?? null,
      trueCost: input.trueCostReceipt ?? null,
      marketLoading: input.marketLoading,
      linkId: input.link.id,
    });
  }

  const peekKind = resolveReceiptPeekKind({
    link: input.link,
    signalLine: input.signalLine ?? null,
    hasAmbientInsight: false,
    timeAvailable: Boolean(input.timeReceipt?.available),
    marketAvailable: Boolean(input.marketSnapshot?.available),
    trueCostAvailable: Boolean(input.trueCostReceipt?.available),
    studyAvailable: Boolean(input.studyReceipt?.available),
  });

  const insight = resolveFeedCardInsight(input.link);
  const priorityKind =
    peekKind === "truecost" || peekKind === "market"
      ? "commerce"
      : peekKind === "study"
        ? "study"
        : peekKind === "time"
          ? "time"
          : peekKind === "save"
            ? "save"
            : insight === "study"
              ? "study"
              : insight === "time"
                ? "time"
                : insight === "market" || insight === "truecost"
                  ? "commerce"
                  : spend
                    ? "spend"
                    : null;

  const sorted = [...candidates].sort((a, b) => {
    const score = (item: ReceiptRailItem) => {
      if (item.kind === priorityKind) {
        return 0;
      }
      if (item.kind === "spend") {
        return 1;
      }
      if (item.kind === "commerce") {
        return 2;
      }
      if (item.kind === "time") {
        return 3;
      }
      if (item.kind === "study") {
        return 4;
      }
      return 5;
    };
    return score(a) - score(b);
  });

  const visible = sorted.filter(isRailItemVisible);

  if (visible.length === 0) {
    return [
      {
        kind: "save",
        link: input.link,
        primaryActionLabel: input.primaryActionLabel,
        signalLine: input.signalLine,
      },
    ];
  }

  return visible.slice(0, MAX_RAIL_ITEMS);
}
