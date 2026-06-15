import { deriveCommerceVerdictPresentation } from "@/lib/commerce/commerce-verdict-presentation";
import type { MarketPriceSnapshot } from "@/lib/commerce/market-price";
import type { TrueCostReceipt } from "@/lib/commerce/true-cost-receipt";
import { buildSaveReceipt } from "@/lib/feed/build-save-receipt";
import type { TimeReceipt } from "@/lib/media/time-receipt";
import type { StudyReceipt } from "@/lib/study/build-study-receipt";
import type { LinkRow } from "@/types/database";

export type InsightDockAccent = "study" | "commerce" | "time" | "neutral";

export function studyInsightDockLabel(receipt: StudyReceipt) {
  if (receipt.pageLabel) {
    return `시험 포스트잇 · ${receipt.title} · ${receipt.pageLabel}`;
  }

  return `시험 포스트잇 · ${receipt.headline}`;
}

export function commerceInsightDockLabel(input: {
  market?: MarketPriceSnapshot | null;
  trueCost?: TrueCostReceipt | null;
}) {
  const verdict = deriveCommerceVerdictPresentation({
    market: input.market ?? null,
    trueCost: input.trueCost ?? null,
  });

  if (!verdict) {
    return "중고 영수증 · 확인 중";
  }

  if (verdict.kind === "pending") {
    return "중고 영수증 · 시세 확인 중";
  }

  return `중고 영수증 · ${verdict.stampLabel} · ${verdict.verdictHeadline}`;
}

export function timeInsightDockLabel(receipt: TimeReceipt) {
  return `시간 영수증 · ${receipt.headline}`;
}

export function saveInsightDockLabel(
  link: LinkRow,
  primaryActionLabel?: string | null
) {
  const save = buildSaveReceipt(link, primaryActionLabel);
  return `저장 영수증 · ${save.title}`;
}

export function insightDockAccentForKind(
  kind: "study" | "commerce" | "time" | "save"
): InsightDockAccent {
  switch (kind) {
    case "study":
      return "study";
    case "commerce":
      return "commerce";
    case "time":
      return "time";
    default:
      return "neutral";
  }
}

export function insightDockCollapseLabel(input: {
  kind: "study" | "commerce" | "time" | "save";
  overlay?: boolean;
}) {
  if (input.overlay) {
    if (input.kind === "study") {
      return "원문 보기";
    }

    return "배경 보기";
  }

  return "접기";
}
