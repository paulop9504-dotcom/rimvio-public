import { applyDisclosureToOrchestratorResult } from "@/lib/action-chat/action-confidence";
import type { OrchestratorResult } from "@/lib/action-chat/orchestrator-types";
import {
  buildTransportLiveOrchestratorPayload,
  isTransitLiveQuery,
} from "@/lib/transport/transport-live-service";

export function orchestrateTransportLive(input: {
  message: string;
  calendarTitle?: string;
}): OrchestratorResult | null {
  const message = input.message.trim();
  if (!message || !isTransitLiveQuery(message)) {
    return null;
  }

  const payload = buildTransportLiveOrchestratorPayload({
    message,
    calendarTitle: input.calendarTitle,
  });

  if (!payload) {
    return null;
  }

  return applyDisclosureToOrchestratorResult(
    {
      summary: payload.summary,
      actions: payload.actions,
      source: "rules",
      confidence: 0.93,
      metadata: { intent: "ACTION", trust_level_adjustment: "NONE" },
      transportLive: payload.card,
      actionsRevealed: true,
      pendingConfirm: false,
    },
    0.93
  );
}
