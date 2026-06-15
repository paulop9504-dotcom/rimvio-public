/** Product recommendation self-learning — behavior logs → weight updates. */

export type ProductLearningEventKind =
  | "impression"
  | "click"
  | "dwell"
  | "conversion"
  | "bounce";

export type ProductLearningEvent = {
  product_id: string;
  timestamp: string;
  kind: ProductLearningEventKind;
  dwell_ms?: number;
};

export type ProductLearningInput = {
  impression_log: ProductLearningEvent[];
  click_log: ProductLearningEvent[];
  dwell_time: Array<{ product_id: string; timestamp: string; dwell_ms: number }>;
  conversion_log: ProductLearningEvent[];
  current_weights?: Record<string, number>;
  learning_rate?: number;
  drop_threshold?: number;
  emerge_threshold?: number;
  expectation?: number;
  min_impressions_to_drop?: number;
  now?: string;
};

export type ProductLearningOutput = {
  updated_product_weights: Record<string, number>;
  dropped_products: string[];
  emerging_products: string[];
  system_bias_shift: "conversion-heavy" | "exploration" | "neutral";
};

export type ProductSignalAggregate = {
  product_id: string;
  reward: number;
  impressions: number;
  clicks: number;
  conversions: number;
};

export const DEFAULT_LEARNING_RATE = 0.12;
export const DEFAULT_DROP_THRESHOLD = 0.2;
export const DEFAULT_EMERGE_THRESHOLD = 0.72;
export const DEFAULT_EXPECTATION = 0.5;
export const DEFAULT_MIN_IMPRESSIONS_TO_DROP = 3;
export const DAILY_DECAY_FACTOR = 0.95;
