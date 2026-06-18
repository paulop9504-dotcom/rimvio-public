import type { OrchestratorResult } from "@/lib/action-chat/orchestrator-types";
import type { AdaptiveBehaviorContext } from "@/lib/action-chat/adaptive-behavior/types";
import { craftMetadataFields } from "@/lib/action-chat/conversation-craft/apply-craft-presentation";

export function orchestrateCrossDomainCraftRoute(
  adaptive: AdaptiveBehaviorContext
): OrchestratorResult | null {
  if (!adaptive.craft.techniques.includes("cross_domain_stitch")) {
    return null;
  }
  if (adaptive.ux.activeListening || adaptive.ux.frustrationEscape) {
    return null;
  }
  if (!adaptive.craft.scheduleAnchor) {
    return null;
  }

  const summary = [
    `${adaptive.craft.scheduleAnchor} 전후로 보니, **미팅 끝나고 피곤하실 타이밍** 같아요.`,
    "근처에서 **조용한 카페·가벼운 한 끼**까지 묶어볼까요?",
    "",
    "👉 식사부터 볼까요, 카페만 먼저 볼까요?",
  ].join("\n");

  return {
    summary,
    actions: [],
    source: "conversation",
    confidence: 0.86,
    disclosure: "none",
    actionsRevealed: false,
    pendingConfirm: false,
    presentation: { mode: "conversation" },
    metadata: craftMetadataFields(adaptive.craft, {
      intent: "CONVERSATION",
      trust_level_adjustment: "NONE",
      semantic_reason: "cross_domain_stitch",
      routing_patch: "CRAFT_CROSS_DOMAIN",
      precision_affordance: "minimal",
    }) as OrchestratorResult["metadata"],
  };
}

export function orchestrateContextualPivotRoute(
  adaptive: AdaptiveBehaviorContext
): OrchestratorResult | null {
  if (!adaptive.craft.techniques.includes("contextual_pivot")) {
    return null;
  }
  if (adaptive.ux.activeListening) {
    return null;
  }

  return {
    summary: [
      "금요일 저녁엔 보통 **운동 루틴**이셨는데, 오늘은 **스트레스 지수**가 높아 보여요.",
      "오늘 하루 운동은 미루고, 근처에서 **가볍게 한잔 + 일찍 쉬기**로 리밸런싱 해볼까요?",
      "",
      "A) 오늘만 쉬기",
      "B) 운동은 유지",
      "C) 가벼운 산책만",
      "",
      "👉 어디가 더 맞을까요?",
    ].join("\n"),
    actions: [],
    source: "conversation",
    confidence: 0.85,
    disclosure: "none",
    actionsRevealed: false,
    pendingConfirm: false,
    presentation: { mode: "conversation" },
    metadata: craftMetadataFields(adaptive.craft, {
      intent: "CONVERSATION",
      trust_level_adjustment: "NONE",
      semantic_reason: "contextual_pivot",
      routing_patch: "CRAFT_CONTEXTUAL_PIVOT",
    }) as OrchestratorResult["metadata"],
  };
}
