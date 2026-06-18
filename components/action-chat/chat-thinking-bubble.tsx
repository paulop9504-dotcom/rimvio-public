"use client";

import { Loader2 } from "lucide-react";
import {
  AiChatBubble,
  type ChatBubbleGroup,
} from "@/components/action-chat/chat-bubble";

/** Compact assistant status while orchestrator is working. */
export function ChatThinkingBubble({
  group = "single",
}: {
  group?: ChatBubbleGroup;
}) {
  return (
    <AiChatBubble group={group}>
      <span className="chat-bubble--thinking inline-flex items-center gap-1.5">
        <Loader2 className="size-3 shrink-0 animate-spin text-rimvio-neon-cyan" aria-hidden />
        [생각중...]
      </span>
    </AiChatBubble>
  );
}
