"use client";

import { openSpawnAction } from "@/lib/action-spawn/open-spawn-action";
import type { InlineChatNavigateWire } from "@/lib/action-chat/mention-navigate/inline-chat-navigate";
import { AuxActionButton } from "@/components/action-chat/aux-action-button";
import { MainActionButton } from "@/components/action-chat/main-action-button";
import { cn } from "@/lib/utils";

type InlineChatNavigateChipProps = {
  navigate: InlineChatNavigateWire;
  onSpawnPrompt?: (uri: string) => void;
  className?: string;
};

export function InlineChatNavigateChip({
  navigate,
  onSpawnPrompt,
  className,
}: InlineChatNavigateChipProps) {
  const openDeeplink = (deeplink: string) => {
    openSpawnAction({ deeplink, onPrompt: onSpawnPrompt });
  };

  return (
    <div
      className={cn(
        "inline-chat-navigate-chip inline-block w-max max-w-[min(100%,320px)] overflow-hidden rounded-2xl border border-white/[0.08] bg-rimvio-surface px-3 py-2.5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04),0_4px_16px_rgba(0,0,0,0.28)]",
        className,
      )}
      aria-label={`길찾기 ${navigate.destination}`}
    >
      <div className="grid w-max max-w-full gap-1.5">
        <MainActionButton
          compact
          tapTarget
          rounded="pill"
          className="w-full min-w-0"
          label={navigate.mainLabel}
          brandFrom={{
            label: navigate.mainLabel,
            deeplink: navigate.mainDeeplink,
          }}
          onClick={() => openDeeplink(navigate.mainDeeplink)}
        />

        {navigate.auxActions.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {navigate.auxActions.map((action) => (
              <AuxActionButton
                key={action.id}
                id={action.id}
                label={action.label}
                icon={action.icon}
                tapTarget
                onClick={() => openDeeplink(action.deeplink)}
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
};
