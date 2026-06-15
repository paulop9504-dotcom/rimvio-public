"use client";

import { useCallback, useState } from "react";
import { ExternalLink } from "lucide-react";
import { AuxSeedButton } from "@/components/action-chat/aux-seed-button";
import type {
  FocusHeldActionWire,
  FocusHeldItemWire,
} from "@/lib/action-chat/mention-focus/inline-chat-focus";
import { cn } from "@/lib/utils";

type FocusHeldInAppCardProps = {
  item: FocusHeldItemWire;
  onAction?: (shadowId: string, action: FocusHeldActionWire) => void;
  className?: string;
};

export function FocusHeldInAppCard({ item, onAction, className }: FocusHeldInAppCardProps) {
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);

  const handleAction = useCallback(
    (action: FocusHeldActionWire) => {
      if (action.kind === "open_embedded" && action.target) {
        setEmbedUrl((current) => (current === action.target ? null : action.target!));
        return;
      }
      onAction?.(item.shadowId, action);
    },
    [item.shadowId, onAction],
  );

  if (item.resolved) {
    return (
      <div className={cn("rimvio-inline-chip__resolved", className)}>
        [{item.sourceApp}] {item.title}
      </div>
    );
  }

  return (
    <article
      className={cn("rimvio-inline-chip-card", className)}
      aria-label={`${item.sourceApp} 알림`}
    >
      <div className="rimvio-inline-chip-card__header">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-[11px] font-semibold text-rimvio-neon-purple">
              {item.sourceApp}
            </p>
            <p className="text-[13px] font-semibold leading-snug text-white">{item.title}</p>
          </div>
          <span className="rimvio-inline-chip-card__badge">{item.category}</span>
        </div>
        {item.body ? (
          <p className="mt-1.5 line-clamp-3 whitespace-pre-wrap text-[12px] leading-relaxed text-white/72">
            {item.body}
          </p>
        ) : (
          <p className="mt-1 text-[12px] text-white/55">{item.summary}</p>
        )}
      </div>

      {embedUrl ? (
        <div className="rimvio-inline-chip-card__embed">
          <iframe
            title={`${item.title} 미리보기`}
            src={embedUrl}
            className="h-44 w-full bg-rimvio-surface"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
            referrerPolicy="no-referrer"
          />
        </div>
      ) : null}

      <div className="space-y-2 px-3 py-2.5">
        <div className="flex flex-wrap gap-1.5">
          {item.mainActions.map((action) => (
            <button
              key={action.id}
              type="button"
              onClick={() => handleAction(action)}
              className={cn(
                "rounded-full px-3 py-1.5 text-[11px] font-semibold transition-transform active:scale-[0.98]",
                action.kind === "open_embedded" && embedUrl
                  ? "bg-white/10 text-white ring-1 ring-white/20"
                  : "bg-rimvio-neon-purple/20 text-rimvio-neon-purple ring-1 ring-rimvio-neon-purple/35",
              )}
            >
              {action.kind === "open_embedded" && embedUrl ? "접기" : action.label}
            </button>
          ))}
        </div>

        {item.auxAction?.target ? (
          <button
            type="button"
            onClick={() => handleAction(item.auxAction!)}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-white/55 transition hover:text-rimvio-neon-cyan"
          >
            {item.auxAction.label}
            <ExternalLink className="size-3" aria-hidden />
          </button>
        ) : item.auxAction ? (
          <span className="text-[11px] text-white/45">{item.auxAction.label}</span>
        ) : null}
      </div>
    </article>
  );
}
