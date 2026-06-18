import type { ComposerAttachment } from "@/lib/action-chat/composer-attachments";
import type { ChatAxis } from "@/lib/action-chat/chat-three-axis";
import { routeRimvioCommand } from "@/lib/command-router";

export type ParsedTurnIntent = {
  trimmed: string;
  pendingAttachments: ComposerAttachment[];
  chatAxis: ChatAxis;
  axisOrchestrateOverride: string | null;
  /** True when there is nothing to send (no text and no attachments). */
  isEmpty: boolean;
};

/** Client intent parse — axis + attachments only; routing happens in `route-client-turn` / hook. */
export function parseTurnIntent(
  text: string,
  options: { attachments?: ComposerAttachment[]; chatAxis?: ChatAxis } | undefined,
  readStoredChatAxis: () => ChatAxis,
): ParsedTurnIntent {
  const raw = text.trim();
  const trimmed = raw.length > 0 ? routeRimvioCommand(raw) : "";
  const pendingAttachments = options?.attachments ?? [];
  const chatAxis = options?.chatAxis ?? readStoredChatAxis();

  return {
    trimmed,
    pendingAttachments,
    chatAxis,
    axisOrchestrateOverride: null,
    isEmpty: !trimmed && pendingAttachments.length === 0,
  };
}
