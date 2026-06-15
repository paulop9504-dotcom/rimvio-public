import type { ActionChatMessage } from "@/lib/action-chat/orchestrator-types";

const CONFIRM_RE =
  /^(?:확인|시작|응|ㅇㅇ|네|예|좋아|ok|okay|yes|start|go|ㅇ)$/iu;
const CANCEL_RE = /^(?:취소|아니|아니요|no|cancel|그만)$/iu;

export function isFocusConfirmSpeech(text: string): boolean {
  return CONFIRM_RE.test(text.trim());
}

export function isFocusCancelSpeech(text: string): boolean {
  return CANCEL_RE.test(text.trim());
}

export function findPendingFocusConfirmMessage(
  messages: ActionChatMessage[],
): ActionChatMessage | null {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (
      message?.role === "assistant" &&
      message.inlineChatFocus?.phase === "awaiting_confirm"
    ) {
      return message;
    }
  }
  return null;
}
