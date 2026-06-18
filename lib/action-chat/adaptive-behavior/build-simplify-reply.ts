import type { AiIntentCategory } from "@/lib/action-chat/classify-ai-intent-utterance";
import type { AdaptiveRoutingHint } from "@/lib/action-chat/adaptive-behavior/types";
import type { HiddenIntentKind } from "@/lib/action-chat/adaptive-behavior/types";
import type { VitalityStateKind } from "@/lib/vitality-state/vitality-state-types";

type SimplifyReplyInput = {
  message: string;
  category?: AiIntentCategory | null;
  hiddenIntents: HiddenIntentKind[];
  vitalityStates: VitalityStateKind[];
  routingHint: AdaptiveRoutingHint | null;
  autoDecide: boolean;
  priorIntent?: string;
};

function domainLabel(priorIntent?: string): string | null {
  switch (priorIntent) {
    case "food":
      return "맛집·음식";
    case "schedule":
      return "일정·약속";
    case "decision":
      return "선택·구매";
    case "health":
      return "운동·건강";
    default:
      return null;
  }
}

/** Single best pick + one soft fallback — no A/B/C branching. */
export function buildSimplifyModeReply(input: SimplifyReplyInput): string {
  const { message, routingHint, priorIntent } = input;
  const trimmed = message.trim();

  if (routingHint === "FOOD" || /(?:먹|맛집|배고)/iu.test(trimmed)) {
    if (input.vitalityStates.includes("hunger") && input.hiddenIntents.includes("anxiety")) {
      return [
        "스트레스 받을 때는 **국밥·분식**처럼 부담 적은 한 끼가 제일 무난해요.",
        "바로 근처 맛집부터 볼게요 — 다른 기준이면 한 마디만 더 알려주세요.",
      ].join("\n\n");
    }
    return [
      "무난하게 **국밥·분식** 쪽이 제일 부담 없어요.",
      "근처에서 바로 찾아볼게요 — 다른 메뉴 원하면 말만 해주세요.",
    ].join("\n\n");
  }

  if (routingHint === "FOOD_DECISION_MIX") {
    return [
      "지금은 배도 고프고 마음도 복잡해 보여요.",
      "**가성비 좋은 한 끼**부터 정리하는 게 제일 덜 피곤해요 — 바로 찾아볼게요.",
    ].join("\n\n");
  }

  if (routingHint === "SCHEDULE_RELIEF" || routingHint === "SCHEDULE") {
    return [
      "오늘은 **일정 1~2개만 미루고** 숨 고를 틈 만드는 게 현실적이에요.",
      "원하면 겹치는 블록부터 바로 재배치해 드릴게요.",
    ].join("\n\n");
  }

  if (routingHint === "COUNSELING" || input.hiddenIntents.includes("anxiety")) {
    return [
      "지금은 **결정보다 마음 정리**가 먼저예요.",
      "일단 **오늘은 이 정도면 충분**하다고 두는 쪽이 무난해요 — 더 줄이고 싶으면 말해 주세요.",
    ].join("\n\n");
  }

  if (input.hiddenIntents.includes("boredom")) {
    return [
      "심심할 때는 **가벼운 산책 + 간단한 한 끼** 조합이 제일 덜 후회돼요.",
      "근처 카페·맛집부터 바로 볼게요.",
    ].join("\n\n");
  }

  const label = domainLabel(priorIntent);
  if (label && input.autoDecide) {
    return [
      `아까 **${label}** 쪽이었던 것 같아요.`,
      "무난한 **첫 번째 선택**부터 바로 이어갈게요 — 다른 주제면 한 마디만 더 알려주세요.",
    ].join("\n\n");
  }

  if (input.category === "HOW_TO") {
    return [
      "**지금 바로 10분만 시작**하는 게 제일 무난해요.",
      "더 쪼개고 싶으면 말해 주세요.",
    ].join("\n\n");
  }

  return [
    "지금 상황에선 **가장 무난한 첫 선택**부터 바로 잡는 게 좋아요.",
    "다른 기준이면 한 마디만 더 알려주세요.",
  ].join("\n\n");
}

export function buildSimplifyContextClarify(input: {
  priorIntent?: string;
  priorDomain?: string;
  confidence: number;
}): string {
  const label = domainLabel(input.priorIntent) ?? "아까 주제";
  if (input.confidence >= 0.35 && input.priorIntent === "food") {
    return [
      `${label} 쪽이었던 것 같아요.`,
      "무난하게 **근처 국밥·분식**부터 볼게요 — 다른 주제면 한 마디만 더 알려주세요.",
    ].join("\n\n");
  }
  if (input.confidence >= 0.35 && input.priorIntent === "schedule") {
    return [
      `${label} 쪽이었던 것 같아요.`,
      "**겹치는 일정 1개만 미루기**부터 제안할게요 — 다른 방향이면 말해 주세요.",
    ].join("\n\n");
  }
  return buildSimplifyModeReply({
    message: "",
    hiddenIntents: ["avoidance"],
    vitalityStates: [],
    routingHint: null,
    autoDecide: true,
    priorIntent: input.priorIntent,
  });
}
