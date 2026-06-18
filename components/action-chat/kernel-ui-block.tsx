"use client";

import { Loader2 } from "lucide-react";
import { AiChatBubble } from "@/components/action-chat/chat-bubble";
import type { KernelUiRenderModel } from "@/lib/event-kernel/render-kernel-ui";
import type { LinkActionItem } from "@/types/database";
import { cn } from "@/lib/utils";

type KernelUiBlockProps = {
  model: KernelUiRenderModel;
  actions?: LinkActionItem[];
  loading?: boolean;
  onAction?: (action: LinkActionItem) => void;
  className?: string;
};

function resolveLinkAction(
  cardId: string,
  actions: LinkActionItem[] | undefined,
): LinkActionItem | undefined {
  return actions?.find((action) => action.id === cardId);
}

export function KernelUiBlock({
  model,
  actions = [],
  loading = false,
  onAction,
  className,
}: KernelUiBlockProps) {
  if (loading) {
    return (
      <AiChatBubble className={className}>
        <span className="inline-flex items-center gap-2 text-white/72">
          <Loader2 className="size-4 animate-spin text-rimvio-neon-cyan" />
          {model.coreMessage || "…"}
        </span>
      </AiChatBubble>
    );
  }

  if (model.kind === "clarify") {
    return (
      <div className={cn("space-y-2.5", className)}>
        <p className="px-1 text-[13px] font-medium text-rimvio-neon-cyan/80">
          {model.sectionLabel}
        </p>
        <AiChatBubble>
          <p className="text-[15px] leading-relaxed text-white/88">{model.coreMessage}</p>
        </AiChatBubble>
      </div>
    );
  }

  if (model.kind === "options") {
    return (
      <div className={cn("space-y-3", className)}>
        <p className="px-1 text-[13px] font-medium text-rimvio-neon-cyan/80">
          {model.sectionLabel}
        </p>
        <div className="flex flex-col gap-2.5">
          {model.actionCards.map((card) => {
            const linkAction = resolveLinkAction(card.id, actions);
            return (
              <button
                key={card.id}
                type="button"
                disabled={!linkAction}
                onClick={() => linkAction && onAction?.(linkAction)}
                className="rounded-2xl bg-rimvio-surface px-4 py-3.5 text-left text-[14px] font-medium leading-snug text-white/88 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)] transition hover:bg-rimvio-surface-raised active:scale-[0.99] disabled:opacity-60"
              >
                {card.label}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {model.coreMessage ? (
        <div className="space-y-2">
          <p className="px-1 text-[13px] font-medium text-white/55">{model.sectionLabel}</p>
          <AiChatBubble>
            <p className="text-[15px] leading-relaxed text-white/88">{model.coreMessage}</p>
          </AiChatBubble>
        </div>
      ) : null}
      {model.actionCards.length > 0 ? (
        <div className="space-y-2">
          {model.nextActionLabel ? (
            <p className="px-1 text-[13px] font-medium text-rimvio-neon-cyan/80">
              {model.nextActionLabel}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-1.5 px-1">
            {model.actionCards.map((card) => {
              const linkAction = resolveLinkAction(card.id, actions);
              return (
                <button
                  key={card.id}
                  type="button"
                  disabled={!linkAction}
                  onClick={() => linkAction && onAction?.(linkAction)}
                  className="rimvio-suggest-chip rounded-full px-3.5 py-2 text-[13px] transition active:scale-[0.98] disabled:opacity-60"
                >
                  {card.label}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
