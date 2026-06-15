import type { EventIntent, ParsedCommand } from "@/lib/command-os/command-os-types";
import { extractCommandContext } from "@/lib/command-os/extract-command-context";

export const CREATE_COMMANDS = new Set([
  "캘린더",
  "calendar",
  "일정",
  "스케줄",
  "schedule",
]);

export const WINDOW_COMMANDS = new Set([
  "새창",
  "window",
  "open",
  "열기",
]);

export const ACTION_COMMANDS = new Set(["액션", "action", "actions"]);

export const SEARCH_COMMANDS = new Set([
  "검색",
  "search",
  "찾기",
  "find",
  "맛집",
]);

function normalizeCommandToken(command: string): string {
  return command.trim().toLowerCase();
}

/**
 * Deterministic intent resolution — no LLM, no SSOT access.
 */
export function resolveIntent(
  command: string,
  query: string
): { intent: EventIntent; resolvedVia: "rule" | "fallback" } {
  const token = normalizeCommandToken(command);

  if (CREATE_COMMANDS.has(token)) {
    return { intent: "CREATE_EVENT", resolvedVia: "rule" };
  }
  if (WINDOW_COMMANDS.has(token)) {
    return { intent: "OPEN_WINDOW", resolvedVia: "rule" };
  }
  if (ACTION_COMMANDS.has(token)) {
    return { intent: "ACTION_QUERY", resolvedVia: "rule" };
  }
  if (SEARCH_COMMANDS.has(token)) {
    return { intent: "SEARCH", resolvedVia: "rule" };
  }

  const context = extractCommandContext(query);
  if (context.time || context.date) {
    return { intent: "CREATE_EVENT", resolvedVia: "fallback" };
  }

  return { intent: "SEARCH", resolvedVia: "fallback" };
}

export function resolveIntentFromParsed(
  parsed: ParsedCommand
): { intent: EventIntent; resolvedVia: "rule" | "fallback" } {
  return resolveIntent(parsed.command, parsed.query);
}
