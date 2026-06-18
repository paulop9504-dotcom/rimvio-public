export type ActionBinStat = {
  action_key: string;
  impressions: number;
  clicks: number;
  skips: number;
};

export type ActionBinEvent = "impression" | "click" | "skip";

export const MIN_BIN_IMPRESSIONS = 8;
export const INTENT_SCORE_WEIGHT = 40;
