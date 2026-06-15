import type { ActionIntentWire } from "@/lib/action-dispatcher/types";
import { getActionIntentDefinition } from "@/lib/action-dispatcher/registry";
import {
  appendSanitizerThought,
  sanitizeActionParams,
} from "@/lib/action-dispatcher/sanitize-action-params";

function normalizeParams(
  raw: unknown,
  userMessage?: string
): ReturnType<typeof sanitizeActionParams> {
  if (!raw || typeof raw !== "object") {
    return { params: {}, sanitized: false };
  }
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value === "string" && value.trim()) {
      out[key] = value.trim();
    }
  }
  return sanitizeActionParams(out, userMessage);
}

/** Parse standalone Action Intent JSON from LLM output. */
export function parseActionIntentWire(
  raw: Record<string, unknown>,
  userMessage?: string
): ActionIntentWire | null {
  if (raw.action === "REGISTER_ACTION" || raw.main_action) {
    return null;
  }

  const action_id =
    typeof raw.action_id === "string"
      ? raw.action_id.trim()
      : typeof raw.actionId === "string"
        ? raw.actionId.trim()
        : "";

  if (!action_id) {
    return null;
  }

  const normalizedId = action_id.toUpperCase();
  if (normalizedId !== "UNKNOWN" && !getActionIntentDefinition(normalizedId)) {
    const normalized = normalizeParams(raw.params, userMessage);
    return {
      action_id: "UNKNOWN",
      params: normalized.params,
      fallback_url:
        typeof raw.fallback_url === "string" && raw.fallback_url.trim()
          ? raw.fallback_url.trim()
          : "https://map.naver.com",
      thought: appendSanitizerThought(
        typeof raw.thought === "string" ? raw.thought : undefined,
        normalized.thoughtNote
      ),
    };
  }

  const normalized = normalizeParams(raw.params, userMessage);

  return {
    action_id: normalizedId,
    params: normalized.params,
    fallback_url:
      typeof raw.fallback_url === "string" && raw.fallback_url.trim()
        ? raw.fallback_url.trim()
        : getActionIntentDefinition(normalizedId)?.fallback_url ??
          "https://map.naver.com",
    thought: appendSanitizerThought(
      typeof raw.thought === "string" ? raw.thought : undefined,
      normalized.thoughtNote
    ),
  };
}
