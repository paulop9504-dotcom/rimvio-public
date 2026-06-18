import {
  ACTION_INTENT_REGISTRY,
  getActionIntentDefinition,
} from "@/lib/action-dispatcher/registry";
import type {
  ActionIntentWire,
  DispatchedActionResult,
} from "@/lib/action-dispatcher/types";

const DEFAULT_FALLBACK = "https://map.naver.com";

function normalizeParams(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== "object") {
    return {};
  }
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value === "string" && value.trim()) {
      out[key] = value.trim();
    } else if (typeof value === "number" || typeof value === "boolean") {
      out[key] = String(value);
    }
  }
  return out;
}

/** Backend dispatcher — Action ID + params → executable URL (LLM never builds schemes). */
export function dispatchAction(input: ActionIntentWire): DispatchedActionResult {
  const actionId = input.action_id?.trim().toUpperCase() || "UNKNOWN";
  const params = normalizeParams(input.params);
  const fallback = input.fallback_url?.trim() || DEFAULT_FALLBACK;
  const thought = input.thought;

  if (actionId === "UNKNOWN") {
    return {
      type: "WEB_OPEN",
      url: fallback,
      action_id: "UNKNOWN",
      label: "웹에서 열기",
      thought,
    };
  }

  const definition = getActionIntentDefinition(actionId);
  if (!definition) {
    return {
      type: "WEB_OPEN",
      url: fallback,
      action_id: actionId,
      label: "웹에서 열기",
      thought,
    };
  }

  const url = definition.buildUrl(params);
  if (url) {
    return {
      type: "EXECUTE",
      url,
      action_id: definition.id,
      label: definition.label,
      thought,
    };
  }

  return {
    type: "WEB_OPEN",
    url: fallback || definition.fallback_url,
    action_id: definition.id,
    label: definition.label,
    thought,
  };
}

export function dispatchActionById(
  actionId: string,
  params: Record<string, string> = {},
  fallback_url = DEFAULT_FALLBACK
): DispatchedActionResult {
  return dispatchAction({ action_id: actionId, params, fallback_url });
}

/** Serialize registry for LLM prompt injection — IDs only, no schemes. */
export function buildActionRegistryMarkdown(): string {
  const rows = Object.values(ACTION_INTENT_REGISTRY).map((entry) => {
    const params =
      entry.params.length > 0 ? entry.params.join(", ") : "(none)";
    return `- **${entry.id}**: ${entry.description} · params: ${params}`;
  });

  return ["# [ACTION_ID REGISTRY]", ...rows].join("\n");
}

export { ACTION_INTENT_REGISTRY };
