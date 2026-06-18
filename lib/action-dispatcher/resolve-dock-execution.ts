import { dispatchActionById } from "@/lib/action-dispatcher/dispatch-action";
import type { DockActionWire } from "@/lib/action-os/types";

function normalizeParams(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== "object") {
    return {};
  }
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value === "string" && value.trim()) {
      out[key] = value.trim();
    }
  }
  return out;
}

/** Resolve action_id execution to a concrete URI via backend registry. */
export function resolveDockActionExecution(
  execution: DockActionWire["execution"] & {
    action_id?: string;
    params?: Record<string, string>;
  },
  fallbackLabel: string
): DockActionWire["execution"] {
  const actionId = execution.action_id?.trim().toUpperCase();
  if (!actionId) {
    return execution;
  }

  const dispatched = dispatchActionById(
    actionId,
    normalizeParams(execution.params),
    "https://map.naver.com"
  );

  return {
    type: dispatched.type,
    uri: dispatched.url,
    action_id: actionId,
    params: normalizeParams(execution.params),
  };
}

export function resolveDockAction(
  action: DockActionWire & {
    execution: DockActionWire["execution"] & {
      action_id?: string;
      params?: Record<string, string>;
    };
  }
): DockActionWire {
  return {
    ...action,
    execution: resolveDockActionExecution(action.execution, action.label),
  };
}
