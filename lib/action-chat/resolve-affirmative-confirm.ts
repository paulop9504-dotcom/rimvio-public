import { isUserConfirmingActions } from "@/lib/action-chat/action-confidence";
import type {
  ActionChatMessage,
  OrchestrateHistoryTurn,
  OrchestratorResult,
} from "@/lib/action-chat/orchestrator-types";

const CONFIRM_PROMPT_PATTERN =
  /(?:등록|저장|추가|넣)할까요|모두\s*등록|진행할까요|맞습니까|확인(?:해|할)?\s*(?:주세요|줄)|일정\s*\d+개를\s*확인/u;

/** Assistant turn still waiting on CONFIRM wire (batch schedule, place, etc.). */
export function isAwaitingConfirmationMessage(message: ActionChatMessage): boolean {
  if (message.role !== "assistant") {
    return false;
  }
  if (message.confirmation?.meta?.intent !== "CONFIRM") {
    return false;
  }
  if (message.flushReport) {
    return false;
  }
  if ((message.actions?.length ?? 0) > 0) {
    return false;
  }
  return true;
}

/** Pending CONFIRM — do not require pendingConfirm flag (high-disclosure confirms omit it). */
export function findPendingConfirmation(
  messages: ActionChatMessage[]
): ActionChatMessage | null {
  return (
    [...messages]
      .reverse()
      .find((message) => isAwaitingConfirmationMessage(message)) ?? null
  );
}

/** Server-side guard when client missed confirm resume — history text only. */
export function historyAwaitingConfirmReply(input: {
  history?: OrchestrateHistoryTurn[];
  userMessage: string;
}): boolean {
  if (!isUserConfirmingActions(input.userMessage)) {
    return false;
  }
  const history = input.history ?? [];
  if (history.length === 0) {
    return false;
  }

  for (let index = history.length - 1; index >= 0; index -= 1) {
    const turn = history[index]!;
    if (
      turn.role === "user" &&
      turn.content.trim() === input.userMessage.trim()
    ) {
      continue;
    }
    if (turn.role === "assistant") {
      return CONFIRM_PROMPT_PATTERN.test(turn.content);
    }
    if (turn.role === "user") {
      return false;
    }
  }

  return false;
}

export function buildAffirmativeConfirmReminderResult(): OrchestratorResult {
  return {
    summary:
      "일정 등록을 이어갈게요. 위 확인 카드에서 **네, 맞습니다**를 눌러 주세요.",
    actions: [],
    source: "rules",
    confidence: 1,
    disclosure: "none",
    actionsRevealed: false,
    pendingConfirm: false,
    metadata: { intent: "SCHEDULE", trust_level_adjustment: "NONE" },
  };
}
