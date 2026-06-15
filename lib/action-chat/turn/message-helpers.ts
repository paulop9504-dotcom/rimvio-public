import type { ActionChatMessage } from "@/lib/action-chat/orchestrator-types";

/** History wire content for orchestrate API (confirm persona text when present). */
export function historyContentFromMessage(message: ActionChatMessage): string {
  if (message.role === "assistant") {
    const confirmText =
      message.confirmation?.persona_message?.trim() ??
      message.confirmation?.confirm_message?.trim();
    if (confirmText) {
      return confirmText;
    }
  }

  return message.text.trim();
}
