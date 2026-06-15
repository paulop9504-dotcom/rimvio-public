import {
  buildInlineChatTimerWire,
  formatMentionTimerLabel,
  type InlineChatTimerWire,
} from "@/lib/action-chat/mention-timer/inline-chat-timer";

export type InlineChatFocusPhase = "awaiting_confirm" | "running" | "done" | "cancelled";

import type { FocusHeldActionWire } from "@/lib/action-chat/mention-focus/build-focus-held-panel";

export type { FocusHeldActionWire } from "@/lib/action-chat/mention-focus/build-focus-held-panel";

export type FocusHeldItemWire = {
  shadowId: string;
  sourceApp: string;
  title: string;
  body: string;
  summary: string;
  category: string;
  mainActions: FocusHeldActionWire[];
  auxAction?: FocusHeldActionWire;
  resolved?: boolean;
};

export type InlineChatFocusWire = {
  phase: InlineChatFocusPhase;
  durationMs: number;
  label: string;
  absorbKakao: boolean;
  absorbEmail: boolean;
  absorbDistractions: boolean;
  startedAt?: string;
  endsAt?: string;
  timer?: InlineChatTimerWire;
  heldCount?: number;
  heldItems?: FocusHeldItemWire[];
  summaryText?: string;
};

export function buildFocusConfirmWire(durationMs: number): InlineChatFocusWire {
  return {
    phase: "awaiting_confirm",
    durationMs,
    label: formatMentionTimerLabel(durationMs),
    absorbKakao: true,
    absorbEmail: true,
    absorbDistractions: true,
  };
}

export function buildRunningFocusWire(
  confirm: InlineChatFocusWire,
  now = Date.now(),
): InlineChatFocusWire {
  const startedAt = new Date(now).toISOString();
  const endsAt = new Date(now + confirm.durationMs).toISOString();
  return {
    ...confirm,
    phase: "running",
    startedAt,
    endsAt,
    timer: buildInlineChatTimerWire(confirm.durationMs, now),
  };
}

export function buildCancelledFocusWire(
  confirm: InlineChatFocusWire,
): InlineChatFocusWire {
  return {
    ...confirm,
    phase: "cancelled",
  };
}

export function buildCompletedFocusWire(input: {
  running: InlineChatFocusWire;
  heldItems: FocusHeldItemWire[];
  summaryText: string;
}): InlineChatFocusWire {
  return {
    ...input.running,
    phase: "done",
    heldCount: input.heldItems.length,
    heldItems: input.heldItems,
    summaryText: input.summaryText,
    timer: input.running.timer
      ? { ...input.running.timer, status: "done" }
      : undefined,
  };
}
