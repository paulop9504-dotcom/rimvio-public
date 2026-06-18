import { decayMultiplier } from "@/lib/product-self-learning/apply-decay";
import type { ProductLearningEvent, ProductSignalAggregate } from "@/lib/product-self-learning/types";

const DWELL_POSITIVE_MS = 10_000;
const BOUNCE_MAX_MS = 2_000;

function rewardForEvent(event: ProductLearningEvent): number {
  switch (event.kind) {
    case "click":
      return 1;
    case "conversion":
      return 5;
    case "dwell":
      return (event.dwell_ms ?? 0) > DWELL_POSITIVE_MS ? 2 : 0;
    case "bounce":
      return (event.dwell_ms ?? 0) < BOUNCE_MAX_MS ? -3 : 0;
    case "impression":
      return 0;
    default:
      return 0;
  }
}

function bumpAggregate(
  map: Map<string, ProductSignalAggregate>,
  productId: string,
  delta: {
    reward?: number;
    impressions?: number;
    clicks?: number;
    conversions?: number;
  },
): void {
  const current = map.get(productId) ?? {
    product_id: productId,
    reward: 0,
    impressions: 0,
    clicks: 0,
    conversions: 0,
  };

  map.set(productId, {
    product_id: productId,
    reward: current.reward + (delta.reward ?? 0),
    impressions: current.impressions + (delta.impressions ?? 0),
    clicks: current.clicks + (delta.clicks ?? 0),
    conversions: current.conversions + (delta.conversions ?? 0),
  });
}

/**
 * Aggregate positive/negative signals with daily decay.
 * Impressions without a matching click in the log batch count as -1 each.
 */
export function aggregateProductSignals(input: {
  impression_log: ProductLearningEvent[];
  click_log: ProductLearningEvent[];
  dwell_time: Array<{ product_id: string; timestamp: string; dwell_ms: number }>;
  conversion_log: ProductLearningEvent[];
  now?: Date;
}): Map<string, ProductSignalAggregate> {
  const now = input.now ?? new Date();
  const aggregates = new Map<string, ProductSignalAggregate>();
  const clickedProducts = new Set(input.click_log.map((entry) => entry.product_id));

  for (const event of input.impression_log) {
    const weight = decayMultiplier(event.timestamp, now);
    bumpAggregate(aggregates, event.product_id, {
      reward: rewardForEvent(event) * weight,
      impressions: 1,
    });

    if (!clickedProducts.has(event.product_id)) {
      bumpAggregate(aggregates, event.product_id, {
        reward: -1 * weight,
      });
    }
  }

  for (const event of input.click_log) {
    const weight = decayMultiplier(event.timestamp, now);
    bumpAggregate(aggregates, event.product_id, {
      reward: rewardForEvent(event) * weight,
      clicks: 1,
    });
  }

  for (const entry of input.dwell_time) {
    const weight = decayMultiplier(entry.timestamp, now);
    const dwellEvent: ProductLearningEvent = {
      product_id: entry.product_id,
      timestamp: entry.timestamp,
      kind: "dwell",
      dwell_ms: entry.dwell_ms,
    };
    const reward = rewardForEvent(dwellEvent);
    if (reward !== 0) {
      bumpAggregate(aggregates, entry.product_id, { reward: reward * weight });
    }
    if (entry.dwell_ms < BOUNCE_MAX_MS) {
      bumpAggregate(aggregates, entry.product_id, {
        reward: rewardForEvent({ ...dwellEvent, kind: "bounce" }) * weight,
      });
    }
  }

  for (const event of input.conversion_log) {
    const weight = decayMultiplier(event.timestamp, now);
    bumpAggregate(aggregates, event.product_id, {
      reward: rewardForEvent(event) * weight,
      conversions: 1,
    });
  }

  return aggregates;
}
