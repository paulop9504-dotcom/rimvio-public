import type { ChatAxis } from "@/lib/action-chat/chat-three-axis";
import { CHAT_AXIS_CONFIG, isChatAxis } from "@/lib/action-chat/chat-three-axis";
import { normalizeAtMentionInput } from "@/lib/command-os/parse-command-input";

export type ParsedMentionAxis = {
  chatAxis: ChatAxis;
  token: string;
  query: string;
  rawInput: string;
};

const AXIS_PATTERNS: { axis: ChatAxis; pattern: RegExp }[] = [
  { axis: "decision", pattern: /^@(고민|decision)(?:\s+(.*))?$/iu },
  { axis: "meal", pattern: /^@(밥|meal)(?:\s+(.*))?$/iu },
  {
    axis: "schedule",
    pattern: /^@(일정(?!정리)|schedule)(?:\s+(.*))?$/iu,
  },
];

export function parseMentionAxisInput(raw: string): ParsedMentionAxis | null {
  const trimmed = normalizeAtMentionInput(raw);
  if (/^@일정정리\b/u.test(trimmed)) {
    return null;
  }

  for (const entry of AXIS_PATTERNS) {
    const match = trimmed.match(entry.pattern);
    if (!match) {
      continue;
    }
    return {
      chatAxis: entry.axis,
      token: match[1] ?? "",
      query: (match[2] ?? "").trim(),
      rawInput: trimmed,
    };
  }

  return null;
}

export function isMentionAxisInput(text: string): boolean {
  return parseMentionAxisInput(text) !== null;
}

export function axisHintCopy(chatAxis: ChatAxis): string {
  const config = CHAT_AXIS_CONFIG[chatAxis];
  return `${config.label} — ${config.hint}\n예: @${config.label} ${config.placeholder.split("…")[0]?.trim() ?? ""}…`;
}

export function resolveChatAxisToken(token: string): ChatAxis | null {
  const normalized = token.trim().toLowerCase();
  for (const entry of AXIS_PATTERNS) {
    const match = entry.pattern.source.match(/^@\((.+?)\)/);
    if (!match?.[1]) {
      continue;
    }
    const aliases = match[1].split("|");
    if (aliases.some((alias) => alias.toLowerCase() === normalized)) {
      return entry.axis;
    }
  }
  if (normalized === "고민") {
    return "decision";
  }
  if (normalized === "밥") {
    return "meal";
  }
  if (normalized === "일정") {
    return "schedule";
  }
  return isChatAxis(normalized) ? normalized : null;
}
