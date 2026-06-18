import type { ParsedCommand } from "@/lib/command-os/command-os-types";
import { isKnownCommandOsToken } from "@/lib/command-os/command-os-tokens";

const COMMAND_LINE = /^@(\S+)\s+(.+)$/u;
const COMMAND_TIGHT = /^@([^\d@\s]+)\s*(\d.+)$/u;

/** Normalize fullwidth @ and stray zero-width chars from mobile keyboards. */
export function normalizeAtMentionInput(raw: string): string {
  return raw
    .trim()
    .replace(/^＠/u, "@")
    .replace(/[\u200B-\u200D\uFEFF]/g, "");
}

/**
 * Deterministic @command parser — @<command> <query>
 */
export function parseCommandInput(raw: string): ParsedCommand | null {
  const trimmed = normalizeAtMentionInput(raw);
  if (!trimmed.startsWith("@")) {
    return null;
  }

  let match = trimmed.match(COMMAND_LINE);
  if (!match) {
    match = trimmed.match(COMMAND_TIGHT);
  }
  if (!match) {
    return null;
  }

  const command = match[1]?.trim() ?? "";
  const query = match[2]?.trim() ?? "";
  if (!command || !query) {
    return null;
  }

  return {
    command,
    query,
    rawInput: trimmed,
  };
}

export function isCommandOsInput(raw: string): boolean {
  const parsed = parseCommandInput(raw);
  return parsed !== null && isKnownCommandOsToken(parsed.command);
}
