import { commitRegisterAction } from "@/lib/action-os/custom-trigger-store";
import { dockUpdateToMasterWire } from "@/lib/action-os/dock-update-to-master-wire";
import { actionIntentToMasterWire } from "@/lib/action-dispatcher/action-intent-to-master-wire";
import { parseActionIntentWire } from "@/lib/action-dispatcher/parse-action-intent-wire";
import {
  parseDockUpdateWire,
  parseNaturalLanguageTrigger,
  parseRegisterActionWire,
} from "@/lib/action-os/parse-action-os-wire";
import {
  REGISTER_ACTION_CONFIRM_MESSAGE,
  type RegisterActionWire,
} from "@/lib/action-os/types";
import type { MasterOrchestratorWire, OrchestratorResult } from "@/lib/action-chat/orchestrator-types";

/** JSON interceptor — REGISTER_ACTION → save + confirm only. */
export function interceptRegisterAction(wire: RegisterActionWire): OrchestratorResult {
  commitRegisterAction(wire);
  return {
    summary: REGISTER_ACTION_CONFIRM_MESSAGE,
    actions: [],
    source: "openai",
    confidence: 1,
    disclosure: "none",
    actionsRevealed: false,
    pendingConfirm: false,
    metadata: {
      intent: "ACTION",
      trust_level_adjustment: "NONE",
    },
  };
}

export function interceptActionOsParsed(
  raw: Record<string, unknown>
): OrchestratorResult | MasterOrchestratorWire | null {
  const register = parseRegisterActionWire(raw);
  if (register) {
    return interceptRegisterAction(register);
  }

  const intent = parseActionIntentWire(raw);
  if (intent) {
    return actionIntentToMasterWire(intent);
  }

  const dock = parseDockUpdateWire(raw);
  if (dock) {
    return dockUpdateToMasterWire(dock);
  }

  return null;
}

export function interceptActionOsFromMessage(message: string): OrchestratorResult | null {
  const nl = parseNaturalLanguageTrigger(message);
  if (nl) {
    return interceptRegisterAction(nl);
  }
  return null;
}

/** Remove thought before user-facing render. */
export function stripThoughtForUser<
  T extends { thought?: string; confirmation?: { thought?: string } },
>(result: T): T {
  const next = { ...result, thought: undefined };
  if (next.confirmation) {
    next.confirmation = { ...next.confirmation, thought: undefined };
  }
  return next;
}
