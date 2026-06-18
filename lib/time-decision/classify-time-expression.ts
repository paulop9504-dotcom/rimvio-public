import type { TimeExpressionAnalysis } from "@/lib/time-decision/types";
import { hasTemporalSchedulePattern } from "@/lib/time/temporal-parsing-protocol";

const RELATIVE =
  /(\d{1,3})\s*분\s*(?:뒤|후|뒤에|후에|안에|이내)|(\d{1,2})\s*시간\s*(?:뒤|후|뒤에|후에|안에|이내)/u;

const ABSOLUTE_COLON = /(\d{1,2}):(\d{2})/u;
const ABSOLUTE_KOREAN =
  /(?:오전|오후|아침|점심|저녁)?\s*(\d{1,2})\s*시(?:\s*(\d{1,2})\s*분)?(?!\s*간)/u;

/** Classify relative vs absolute time — relative wins when both could match. */
export function classifyTimeExpression(message: string): TimeExpressionAnalysis {
  const trimmed = message.trim();
  if (!trimmed) {
    return { kind: "none" };
  }

  if (hasTemporalSchedulePattern(trimmed)) {
    return { kind: "relative", raw: "temporal_offset" };
  }

  const relative = trimmed.match(RELATIVE);
  if (relative) {
    return { kind: "relative", raw: relative[0] };
  }

  const colon = trimmed.match(ABSOLUTE_COLON);
  if (colon) {
    return { kind: "absolute", raw: colon[0] };
  }

  const korean = trimmed.match(ABSOLUTE_KOREAN);
  if (korean) {
    return { kind: "absolute", raw: korean[0] };
  }

  return { kind: "none" };
}

export function hasTimeExpression(message: string): boolean {
  return classifyTimeExpression(message).kind !== "none";
}

export function isRelativeTimeExpression(message: string): boolean {
  return classifyTimeExpression(message).kind === "relative";
}

export function isAbsoluteTimeExpression(message: string): boolean {
  return classifyTimeExpression(message).kind === "absolute";
}
