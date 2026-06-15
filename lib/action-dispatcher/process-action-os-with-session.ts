import { actionIntentToMasterWire } from "@/lib/action-dispatcher/action-intent-to-master-wire";
import { parseActionIntentWire } from "@/lib/action-dispatcher/parse-action-intent-wire";
import { interceptActionOsParsed } from "@/lib/action-os/intercept-action-os";
import {
  applySessionIntentCorrection,
  commitSessionIntent,
  getSessionIntent,
  isCorrectionMessage,
  sessionIntentToActionIntent,
  sessionIntentToDockJson,
} from "@/lib/action-os/session-intent-state";
import type { MasterOrchestratorWire, OrchestratorResult } from "@/lib/action-chat/orchestrator-types";

export type ProcessActionOsSessionInput = {
  raw: Record<string, unknown>;
  userMessage?: string;
  scopeId?: string;
};

/**
 * Action OS middleware with session intent memory.
 * Correction utterances reuse action_id and replace params — prior intent discarded.
 */
export function processActionOsWithSession(
  input: ProcessActionOsSessionInput
): OrchestratorResult | MasterOrchestratorWire | null {
  const scopeId = input.scopeId ?? "default";
  const userMessage = input.userMessage?.trim() ?? "";

  if (userMessage && isCorrectionMessage(userMessage)) {
    const corrected = applySessionIntentCorrection({
      message: userMessage,
      previous: getSessionIntent(scopeId),
    });
    if (corrected) {
      commitSessionIntent(corrected, scopeId);
      const intent = sessionIntentToActionIntent(corrected);
      return actionIntentToMasterWire(intent);
    }
  }

  let raw = input.raw;

  if (userMessage && isCorrectionMessage(userMessage) && !getSessionIntent(scopeId)) {
    const target = userMessage.replace(/^(?:아니야|아니|no,?\s*)\s*/iu, "").trim();
    if (target.length >= 2) {
      raw = sessionIntentToDockJson({
        action_id: "NAVIGATE",
        params: { dest: target },
        fallback_url: "https://map.naver.com",
        thought: `Correction without prior session — new intent dest='${target}'.`,
        updatedAt: new Date().toISOString(),
      });
    }
  }

  const intent = parseActionIntentWire(raw, userMessage);
  if (intent) {
    commitSessionIntent(intent, scopeId);
    return actionIntentToMasterWire(intent);
  }

  const intercepted = interceptActionOsParsed(raw);
  if (intercepted && "actionOsDock" in intercepted && intercepted.actionOsDock) {
    const dockIntent = parseActionIntentWire(
      {
        action_id:
          (intercepted.actionOsDock.main_action.execution as { action_id?: string })
            .action_id ?? "UNKNOWN",
        params:
          (intercepted.actionOsDock.main_action.execution as { params?: Record<string, string> })
            .params ?? {},
        fallback_url: "https://map.naver.com",
        thought: intercepted.thought,
      },
      userMessage
    );
    if (dockIntent) {
      commitSessionIntent(dockIntent, scopeId);
    }
  }

  return intercepted;
}
