import { hasCompactAmbientPoster } from "@/lib/feed/resolve-compact-ambient-poster";
import type { LinkRow } from "@/types/database";

export type ReceiptPeekKind = "save" | "time" | "market" | "truecost" | "study";

export function resolveReceiptPeekKind(input: {
  link: LinkRow;
  signalLine: string | null;
  hasAmbientInsight: boolean;
  timeAvailable: boolean;
  marketAvailable: boolean;
  trueCostAvailable: boolean;
  studyAvailable?: boolean;
}): ReceiptPeekKind | null {
  if (input.hasAmbientInsight) {
    return null;
  }

  const signal = input.signalLine?.trim() ?? "";

  if (/시험|포스트잇|학습|외우|study|document_study|📖|p\.\d+/i.test(signal)) {
    return input.studyAvailable ? "study" : "save";
  }

  if (/true\s*cost|진짜\s*영수증|보유\s*비용/i.test(signal)) {
    return input.trueCostAvailable ? "truecost" : "save";
  }

  if (/시세|비교|최저가|협상/i.test(signal) && input.marketAvailable) {
    return "market";
  }

  if (/시간|읽기|영상|재생/i.test(signal) && input.timeAvailable) {
    return "time";
  }

  if (input.trueCostAvailable) {
    return "truecost";
  }

  if (input.marketAvailable) {
    return "market";
  }

  if (input.studyAvailable) {
    return "study";
  }

  if (input.timeAvailable) {
    return "time";
  }

  const sparseVisual =
    !hasCompactAmbientPoster(input.link) && !input.link.thumbnail_url?.trim();

  if (sparseVisual || input.link.category === "uncategorized") {
    return "save";
  }

  if (!input.hasAmbientInsight) {
    return "save";
  }

  return null;
}
