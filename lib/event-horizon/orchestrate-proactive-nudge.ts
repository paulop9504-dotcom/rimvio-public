import type { OrchestratorResult } from "@/lib/action-chat/orchestrator-types";
import { isConversationalOnlyMessage } from "@/lib/action-chat/conversation-turns";
import type {
  EventHorizonInsight,
  GlobalBrainSnapshot,
  UserStatusRecord,
} from "@/lib/global-brain/types";

function hasExplicitActionIntent(message: string): boolean {
  return /https?:\/\/|지도|맛집|길\s*찾|네비|검색|예약|일정\s*잡|전화(?:해|걸)|추천\s*해|찾아\s*줘|열어\s*줘|알려\s*줘/iu.test(
    message,
  );
}

function shouldProactiveEventHorizon(input: {
  message: string;
  insights: EventHorizonInsight[];
  userStatus: UserStatusRecord | null;
}): boolean {
  if (input.insights.length === 0) {
    return false;
  }
  if (hasExplicitActionIntent(input.message)) {
    return false;
  }
  const top = input.insights[0];
  if (!top || top.severity !== "high") {
    return false;
  }
  const trimmed = input.message.trim();
  if (trimmed.length <= 32 || isConversationalOnlyMessage(trimmed)) {
    return true;
  }
  if (input.userStatus && trimmed.length <= 48) {
    return true;
  }
  return false;
}

function buildEventHorizonProactiveResult(
  insight: EventHorizonInsight,
  snapshot: GlobalBrainSnapshot,
): OrchestratorResult {
  const statusHint = snapshot.userStatus?.label
    ? `${snapshot.userStatus.label} 상태를 기억하고 있어요. `
    : "";

  return {
    summary: `${statusHint}${insight.headline} ${insight.suggestion}`,
    actions: [
      {
        id: "event-horizon-reschedule",
        label: "일정 조정하기",
        kind: "custom",
        payload: {
          experienceChoicePrompt: "오늘 일정 중 미룰 수 있는 것 찾아서 조정해줘",
        },
      },
      {
        id: "event-horizon-core-only",
        label: "급한 것만",
        kind: "custom",
        payload: {
          experienceChoicePrompt: "오늘 꼭 필요한 일만 남기고 나머지 정리해줘",
        },
      },
    ],
    source: "rules",
    confidence: 0.88,
    disclosure: "high",
    actionsRevealed: true,
    pendingConfirm: false,
    metadata: { intent: "ACTION", trust_level_adjustment: "NONE" },
    thought: `EventHorizon · ${insight.kind}`,
  };
}

/** Phase-2 fast path — not Global Brain. */
export function tryEventHorizonProactiveResult(input: {
  message: string;
  snapshot: GlobalBrainSnapshot;
  skipWhenBusy?: boolean;
}): OrchestratorResult | null {
  if (input.skipWhenBusy) {
    return null;
  }
  if (
    !shouldProactiveEventHorizon({
      message: input.message,
      insights: input.snapshot.eventHorizon,
      userStatus: input.snapshot.userStatus,
    })
  ) {
    return null;
  }
  const top = input.snapshot.eventHorizon[0];
  if (!top) {
    return null;
  }
  return buildEventHorizonProactiveResult(top, input.snapshot);
}
