export type {
  ProductLearningEvent,
  ProductLearningEventKind,
  ProductLearningInput,
  ProductLearningOutput,
  ProductSignalAggregate,
} from "@/lib/product-self-learning/types";

export {
  DEFAULT_LEARNING_RATE,
  DEFAULT_DROP_THRESHOLD,
  DEFAULT_EMERGE_THRESHOLD,
  DEFAULT_EXPECTATION,
  DEFAULT_MIN_IMPRESSIONS_TO_DROP,
  DAILY_DECAY_FACTOR,
} from "@/lib/product-self-learning/types";

export { decayMultiplier, daysSince, clamp01 } from "@/lib/product-self-learning/apply-decay";
export { aggregateProductSignals } from "@/lib/product-self-learning/compute-reward";
export { updateProductWeights } from "@/lib/product-self-learning/update-product-weights";
export { runProductSelfLearningLoop } from "@/lib/product-self-learning/run-product-learning-loop";
