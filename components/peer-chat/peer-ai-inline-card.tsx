"use client";

import type { PeerMessage } from "@/lib/context/peer-message-types";
import { DM_CHAT } from "@/lib/peer-chat/dm-chat-density";
import { cn } from "@/lib/utils";

type PeerAiInlineCardProps = {
  message: PeerMessage;
  className?: string;
  simple?: boolean;
};

export function PeerAiInlineCard({
  message,
  className,
  simple = false,
}: PeerAiInlineCardProps) {
  const payload = message.aiPayload;
  const actions = payload?.actions ?? [];

  return (
    <div
      className={cn(
        "max-w-[94%]",
        simple
          ? cn(
              DM_CHAT.bubblePx,
              DM_CHAT.bubblePy,
              DM_CHAT.bubbleText,
              DM_CHAT.bubbleRadius,
              DM_CHAT.bubbleMeCorner,
              "border border-border bg-muted text-foreground",
            )
          : "rounded-2xl border border-rimvio-neon-purple/25 bg-rimvio-neon-purple/10 px-4 py-2.5 text-[17px] leading-snug",
        className,
      )}
    >
      {simple ? (
        <p className="mb-0.5 text-[9px] leading-none text-muted-foreground">AI</p>
      ) : null}
      <p className="whitespace-pre-wrap break-words">
        {payload?.summary ?? message.body}
      </p>
      {actions.length > 0 ? (
        <ul className="mt-1 flex flex-col gap-0.5">
          {actions.map((action) => (
            <li key={action.id}>
              {action.href ? (
                <a
                  href={action.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[12px] text-[#8ab4f8] underline-offset-2 hover:underline"
                >
                  {action.label}
                </a>
              ) : (
                <span className="text-[12px] text-muted-foreground">{action.label}</span>
              )}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
