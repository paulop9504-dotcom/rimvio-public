import { parseActionIntentWire } from "@/lib/action-dispatcher/parse-action-intent-wire";
import type { ActionIntentWire } from "@/lib/action-dispatcher/types";
import type { OrchestratorResult } from "@/lib/action-chat/orchestrator-types";

type DockExecution = {
  action_id?: string;
  params?: Record<string, string>;
};

function inferParamsFromActions(result: OrchestratorResult): Record<string, string> {
  const payload = result.actions?.[0]?.payload as Record<string, unknown> | undefined;
  const params: Record<string, string> = {};
  if (typeof payload?.dest === "string" && payload.dest.trim()) {
    params.dest = payload.dest.trim();
  }
  if (typeof payload?.destination === "string" && payload.destination.trim()) {
    params.destination = payload.destination.trim();
  }
  if (typeof payload?.query === "string" && payload.query.trim()) {
    params.query = payload.query.trim();
  }
  return params;
}

/** Pull ActionIntentWire from dock, payload, or inferred NAVIGATE dest. */
export function extractActionIntentFromResult(
  result: OrchestratorResult,
  message?: string
): ActionIntentWire | null {
  const dock = result.actionOsDock;
  const mainExec = dock?.main_action?.execution as DockExecution | undefined;

  if (mainExec?.action_id?.trim()) {
    return parseActionIntentWire(
      {
        action_id: mainExec.action_id,
        params: mainExec.params ?? inferParamsFromActions(result),
        fallback_url: "https://map.naver.com",
        thought: result.thought,
      },
      message
    );
  }

  const primary = result.actions?.[0];
  const payload = primary?.payload as Record<string, unknown> | undefined;

  if (typeof payload?.action_id === "string" && payload.action_id.trim()) {
    return parseActionIntentWire(
      {
        action_id: payload.action_id,
        params: (payload.params as Record<string, string>) ?? {},
        fallback_url: "https://map.naver.com",
        thought: result.thought,
      },
      message
    );
  }

  const dest =
    (typeof payload?.dest === "string" ? payload.dest : null) ??
    (typeof payload?.destination === "string" ? payload.destination : null);
  if (dest?.trim()) {
    return parseActionIntentWire(
      {
        action_id: "NAVIGATE",
        params: { dest: dest.trim() },
        fallback_url: "https://map.naver.com",
        thought: result.thought,
      },
      message
    );
  }

  return null;
}
