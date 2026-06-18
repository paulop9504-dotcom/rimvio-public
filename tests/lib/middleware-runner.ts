import { interceptActionOsParsed } from "@/lib/action-os/intercept-action-os";
import { parseActionIntentWire } from "@/lib/action-dispatcher/parse-action-intent-wire";
import { actionIntentToMasterWire } from "@/lib/action-dispatcher/action-intent-to-master-wire";
import { processActionOsWithSession } from "@/lib/action-dispatcher/process-action-os-with-session";
import type { MasterOrchestratorWire, OrchestratorResult } from "@/lib/action-chat/orchestrator-types";

/** Run Action OS JSON through the same intercept path as production wire parsing. */
export function processActionOsMiddlewareJson(
  raw: Record<string, unknown>,
  userMessage?: string,
  scopeId?: string
): OrchestratorResult | MasterOrchestratorWire | null {
  return processActionOsWithSession({ raw, userMessage, scopeId });
}

export function assertValidJsonObject(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label}: expected JSON object`);
  }
  return value as Record<string, unknown>;
}

export function parseJsonOnly(text: string, label: string): Record<string, unknown> {
  const trimmed = text.trim();
  if (/^(?:안녕|입력을|죄송|네[,!]?)/u.test(trimmed)) {
    throw new Error(`${label}: conversational prose detected — JSON only required`);
  }
  if (trimmed.includes("```")) {
    throw new Error(`${label}: markdown fence detected — JSON only required`);
  }
  try {
    return assertValidJsonObject(JSON.parse(trimmed), label);
  } catch (error) {
    throw new Error(`${label}: invalid JSON — ${(error as Error).message}`);
  }
}
