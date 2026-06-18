import { aggregateProductSignals } from "@/lib/product-self-learning/compute-reward";
import { clamp01 } from "@/lib/product-self-learning/apply-decay";
import type {
  ProductLearningInput,
  ProductLearningOutput,
  ProductSignalAggregate,
} from "@/lib/product-self-learning/types";
import {
  DEFAULT_DROP_THRESHOLD,
  DEFAULT_EMERGE_THRESHOLD,
  DEFAULT_EXPECTATION,
  DEFAULT_LEARNING_RATE,
  DEFAULT_MIN_IMPRESSIONS_TO_DROP,
} from "@/lib/product-self-learning/types";

function inferBiasShift(aggregates: ProductSignalAggregate[]): ProductLearningOutput["system_bias_shift"] {
  if (aggregates.length === 0) {
    return "neutral";
  }

  const totalReward = aggregates.reduce((sum, entry) => sum + entry.reward, 0);
  const conversions = aggregates.reduce((sum, entry) => sum + entry.conversions, 0);
  const clicks = aggregates.reduce((sum, entry) => sum + entry.clicks, 0);
  const impressions = aggregates.reduce((sum, entry) => sum + entry.impressions, 0);

  if (conversions >= 1 || (clicks >= 2 && totalReward > 0)) {
    return "conversion-heavy";
  }

  const noClickRate =
    impressions > 0 ? (impressions - clicks) / impressions : 0;
  if (noClickRate >= 0.65 || totalReward < 0) {
    return "exploration";
  }

  return "neutral";
}

/**
 * new_score = old_score + learning_rate × (reward - expectation)
 * Drops low performers; surfaces emerging high performers.
 */
export function updateProductWeights(input: ProductLearningInput): ProductLearningOutput {
  const learningRate = input.learning_rate ?? DEFAULT_LEARNING_RATE;
  const dropThreshold = input.drop_threshold ?? DEFAULT_DROP_THRESHOLD;
  const emergeThreshold = input.emerge_threshold ?? DEFAULT_EMERGE_THRESHOLD;
  const expectation = input.expectation ?? DEFAULT_EXPECTATION;
  const minImpressionsToDrop = input.min_impressions_to_drop ?? DEFAULT_MIN_IMPRESSIONS_TO_DROP;
  const current = input.current_weights ?? {};

  const aggregates = aggregateProductSignals({
    impression_log: input.impression_log,
    click_log: input.click_log,
    dwell_time: input.dwell_time,
    conversion_log: input.conversion_log,
    now: input.now ? new Date(input.now) : new Date(),
  });

  const updated_product_weights: Record<string, number> = { ...current };
  const dropped_products: string[] = [];
  const emerging_products: string[] = [];

  const productIds = new Set([
    ...Object.keys(current),
    ...Array.from(aggregates.keys()),
  ]);

  for (const productId of productIds) {
    const aggregate = aggregates.get(productId);
    const oldScore = current[productId] ?? 0.5;
    const reward = aggregate?.reward ?? 0;
    const newScore = clamp01(oldScore + learningRate * (reward - expectation));
    updated_product_weights[productId] = newScore;

    if (
      aggregate &&
      aggregate.impressions >= minImpressionsToDrop &&
      newScore < dropThreshold
    ) {
      dropped_products.push(productId);
      delete updated_product_weights[productId];
      continue;
    }

    const delta = newScore - oldScore;
    if (newScore >= emergeThreshold && delta >= 0.08) {
      emerging_products.push(productId);
    }
  }

  emerging_products.sort(
    (left, right) => (updated_product_weights[right] ?? 0) - (updated_product_weights[left] ?? 0),
  );

  return {
    updated_product_weights,
    dropped_products,
    emerging_products: emerging_products.slice(0, 5),
    system_bias_shift: inferBiasShift(Array.from(aggregates.values())),
  };
}
