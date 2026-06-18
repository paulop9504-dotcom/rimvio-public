import { applyDisclosureToOrchestratorResult } from "@/lib/action-chat/action-confidence";
import type { OrchestratorResult } from "@/lib/action-chat/orchestrator-types";
import { matchUserDefinedAction } from "@/lib/actions/match-user-defined-action";
import type { UserDefinedAction } from "@/lib/actions/user-defined-action-types";
import { createOpenAction } from "@/lib/enrichers/action-factory";

function trimSummary(text: string) {
  return text.replace(/\s+/g, " ").trim().slice(0, 40);
}

export function orchestrateUserDefinedAction(input: {
  message: string;
  userDefinedActions?: UserDefinedAction[];
}): OrchestratorResult | null {
  const actions = input.userDefinedActions ?? [];
  const match = matchUserDefinedAction(input.message, actions);
  if (!match) {
    return null;
  }

  const amountLabel = match.params.amount
    ? `${Number(match.params.amount).toLocaleString("ko-KR")}원`
    : null;

  const summary = amountLabel
    ? trimSummary(`${match.action.name} ${amountLabel}`)
    : trimSummary(`${match.action.name} 준비`);

  const openAction = createOpenAction({
    label: match.action.name,
    href: match.resolvedUrl,
    icon: "link",
    copyText: match.resolvedUrl,
    payload: {
      userDefinedActionId: match.action.id,
      userDefinedAction: true,
      resolvedParams: match.params,
    },
  });

  return applyDisclosureToOrchestratorResult(
    {
      summary,
      actions: [openAction],
      source: "rules",
      confidence: 0.94,
      metadata: { intent: "ACTION", trust_level_adjustment: "NONE" },
      actionsRevealed: true,
      pendingConfirm: false,
    },
    0.94
  );
}
