import type { LinkActionItem, LinkRow } from "@/types/database";
import { isGarbledCaptureOcr } from "@/lib/capture/is-garbled-capture-ocr";
import { getDisplayTitleForLink } from "@/lib/feed/sanitize-link-title";
import { isScreenshotLink } from "@/lib/share/ingest-screenshot";
import type { OrchestratorResult } from "@/lib/action-chat/orchestrator-types";

export const CONFIDENCE_HIGH = 0.9;
export const CONFIDENCE_MEDIUM = 0.6;

export type ActionDisclosureTier = "high" | "medium" | "low" | "none";

export function resolveDisclosureTier(confidence: number): ActionDisclosureTier {
  if (confidence >= CONFIDENCE_HIGH) {
    return "high";
  }
  if (confidence >= CONFIDENCE_MEDIUM) {
    return "medium";
  }
  if (confidence > 0) {
    return "low";
  }
  return "none";
}

export function estimateLinkActionConfidence(input: {
  link: LinkRow;
  locateLoading?: boolean;
  hasLocateResult?: boolean;
  primary?: LinkActionItem | null;
}): number {
  if (input.locateLoading) {
    return 0;
  }

  if (input.hasLocateResult) {
    return 0.93;
  }

  const title = getDisplayTitleForLink(input.link) ?? "";
  if (isGarbledCaptureOcr(title)) {
    return 0.52;
  }

  if (isScreenshotLink(input.link)) {
    return title.length >= 2 ? 0.88 : 0.62;
  }

  const category = input.link.category ?? "";
  if (category === "travel" || category === "food") {
    return 0.86;
  }
  if (category === "shopping" || input.link.source_type === "commerce") {
    return 0.84;
  }

  if (/map|naver|google\.com\/maps|kakaomap/i.test(input.link.original_url)) {
    return 0.9;
  }

  if (input.link.actions.length >= 2) {
    return 0.78;
  }

  if (input.primary?.href?.startsWith("http")) {
    return 0.74;
  }

  return 0.65;
}

export function buildProgressiveSummary(input: {
  title: string;
  tier: ActionDisclosureTier;
  primaryLabel: string;
}): string {
  const label = input.title.trim() || "이 내용";

  if (input.tier === "medium") {
    return `${label} 정보를 찾았어요. ${stripEmoji(input.primaryLabel)}을 켜드릴까요?`;
  }

  if (input.tier === "high") {
    return `${label} 맞죠? 필요한 액션을 준비해 두었어요.`;
  }

  return `${label} 관련해 더 확인이 필요해요.`;
}

function stripEmoji(label: string) {
  return label
    .replace(/^[\s\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]+/u, "")
    .trim();
}

export function applyDisclosureToOrchestratorResult(
  result: OrchestratorResult,
  confidenceOverride?: number
): OrchestratorResult {
  if (result.actions.length === 0) {
    return {
      ...result,
      confidence: 1,
      disclosure: "none",
      actionsRevealed: false,
      pendingConfirm: false,
    };
  }

  const confidence =
    confidenceOverride ??
    result.confidence ??
    (result.source === "openai" ? 0.88 : 0.8);

  const disclosure = resolveDisclosureTier(confidence);
  const primaryLabel = result.actions[0]?.label ?? "액션";

  if (disclosure === "low") {
    return {
      ...result,
      summary: `${result.summary} 어떤 도움이 필요하신지 조금 더 알려주실까요?`,
      actions: [],
      confidence,
      disclosure,
      actionsRevealed: false,
      pendingConfirm: false,
    };
  }

  let summary = result.summary;
  if (disclosure === "medium") {
    summary = buildProgressiveSummary({
      title: result.summary.replace(/[.!?…]+$/u, ""),
      tier: "medium",
      primaryLabel,
    });
  } else if (disclosure === "high") {
    summary = buildProgressiveSummary({
      title: result.summary.replace(/[.!?…]+$/u, ""),
      tier: "high",
      primaryLabel,
    });
  }

  return {
    ...result,
    summary,
    confidence,
    disclosure,
    actionsRevealed: false,
    pendingConfirm: disclosure === "medium",
  };
}

import {
  isActionUiConfirm,
  isCommitRejectMessage,
} from "@/lib/action-chat/commit-speech";

export function isUserConfirmingActions(message: string) {
  const normalized = message.trim().replace(/\s+/g, " ");
  if (isUserRequestingAlternate(normalized)) {
    return false;
  }
  return isActionUiConfirm(normalized);
}

export function isUserRequestingAlternate(message: string) {
  const normalized = message.trim().replace(/\s+/g, " ");
  if (isCommitRejectMessage(normalized)) {
    return true;
  }
  return (
    /^(?:아니(?:요|오)?|다른(?:\s*거)?|또\s*다른|다시(?:\s*찾)?)(?:[\s,.!?~]*(?:보여(?:줘|주세요)?|해(?:줘|주세요)?|액션|거|띄워(?:줘|주세요)?|찾아(?:줘|주세요)?))?/iu.test(
      normalized
    ) ||
    /다른\s*거\s*보여(?:줘|주세요)?/iu.test(normalized) ||
    /아니요?\s*,?\s*다른/iu.test(normalized)
  );
}

export function shouldShowMagicPulse(input: {
  tier: ActionDisclosureTier;
  actionsRevealed: boolean;
  hasActions: boolean;
  loading?: boolean;
}) {
  return (
    !input.loading &&
    input.hasActions &&
    input.tier === "high" &&
    !input.actionsRevealed
  );
}

export function shouldShowConfirmPrompt(input: {
  tier: ActionDisclosureTier;
  actionsRevealed: boolean;
  hasActions: boolean;
  loading?: boolean;
}) {
  return (
    !input.loading &&
    input.hasActions &&
    input.tier === "medium" &&
    !input.actionsRevealed
  );
}

export function shouldShowActionGrid(input: {
  tier: ActionDisclosureTier;
  actionsRevealed: boolean;
  hasActions: boolean;
  loading?: boolean;
}) {
  if (input.loading || !input.hasActions) {
    return false;
  }
  if (input.tier === "low" || input.tier === "none") {
    return false;
  }
  if (input.tier === "high" || input.tier === "medium") {
    return input.actionsRevealed;
  }
  return false;
}

export function estimateRuleOrchestratorConfidence(input: {
  message: string;
  actionCount: number;
  hasExplicitUrl: boolean;
}): number {
  const lower = input.message.toLowerCase();

  if (input.hasExplicitUrl) {
    return 0.92;
  }
  if (/길찾|네비|navigation|navigate/i.test(input.message)) {
    return 0.9;
  }
  if (/지도|위치|맛집|식당|카페|place|map/i.test(lower)) {
    return 0.87;
  }
  if (/최저|가격|쇼핑|구매|shopping|price/i.test(lower)) {
    return 0.84;
  }
  if (/리뷰|후기|review|blog/i.test(lower)) {
    return 0.8;
  }
  if (input.actionCount >= 2) {
    return 0.76;
  }
  return 0.68;
}

export function normalizeConfidenceScore(value: unknown): number | undefined {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return undefined;
  }
  if (value > 1) {
    return Math.min(value / 100, 1);
  }
  return Math.max(0, Math.min(value, 1));
}
