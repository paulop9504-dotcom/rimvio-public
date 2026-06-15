import { applyDisclosureToOrchestratorResult } from "@/lib/action-chat/action-confidence";
import type { OrchestratorResult } from "@/lib/action-chat/orchestrator-types";
import { validateLinkAction } from "@/lib/actions/action-validator";
import { createOpenAction } from "@/lib/enrichers/action-factory";
import { resolveKoreanServiceDeeplink } from "@/lib/korean-service-router/resolve-korean-service-deeplink";

function actionLabel(serviceName: string, actionType: string): string {
  switch (actionType) {
    case "ORDER":
      return `${serviceName}에서 주문`;
    case "BOOK":
      return `${serviceName} 예약`;
    case "COMPARE":
      return `${serviceName} 비교`;
    case "LEARN":
      return `${serviceName} 학습`;
    default:
      return `${serviceName} 열기`;
  }
}

export function orchestrateKoreanServiceRouter(input: {
  message: string;
}): OrchestratorResult | null {
  const routing = resolveKoreanServiceDeeplink(input.message);
  if (!routing) {
    return null;
  }

  const open = createOpenAction({
    label: actionLabel(routing.serviceName, routing.action_type),
    href: routing.deeplink,
    icon: "link",
    copyText: routing.deeplink,
    payload: {
      koreanServiceRouter: true,
      serviceId: routing.serviceId,
      actionType: routing.action_type,
      confidence: routing.confidence,
      fallbackHref: routing.fallback,
    },
  });

  const action = validateLinkAction(open);
  if (!action) {
    return null;
  }

  const summary =
    routing.urgency === "HIGH"
      ? `${routing.serviceName} 바로 실행`
      : `${routing.serviceName} 이동`;

  return applyDisclosureToOrchestratorResult(
    {
      summary,
      actions: [action],
      source: "rules",
      confidence: routing.confidence,
      metadata: { intent: "ACTION", trust_level_adjustment: "NONE" },
      actionsRevealed: true,
      pendingConfirm: false,
      thought: routing.reason,
    },
    routing.confidence,
  );
}
