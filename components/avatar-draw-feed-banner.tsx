"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { RimvioAvatarMark } from "@/lib/brand/rimvio-smiley-mark";
import { useCopy } from "@/hooks/use-copy";
import { useRoomGuest } from "@/hooks/use-room-guest";
import {
  dismissAvatarDrawBanner,
  shouldShowAvatarDrawBanner,
} from "@/lib/onboarding/avatar-onboarding";
import { cn } from "@/lib/utils";

export function AvatarDrawFeedBanner({ className }: { className?: string }) {
  const copy = useCopy();
  const guest = useRoomGuest();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(shouldShowAvatarDrawBanner(guest.avatarDrawn));
  }, [guest.avatarDrawn]);

  if (!visible || guest.avatarDrawn) {
    return null;
  }

  return (
    <div
      className={cn(
        "pointer-events-auto absolute inset-x-3 top-[max(0.75rem,env(safe-area-inset-top))] z-40",
        className
      )}
    >
      <div className="flex items-center gap-3 rounded-2xl bg-rimvio-surface/95 p-3 shadow-lg ring-1 ring-rimvio-neon-purple/15 backdrop-blur-md">
        <RimvioAvatarMark pixels={40} crisp className="shrink-0 opacity-80" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold">{copy.settings.drawFeedBannerTitle}</p>
          <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
            {copy.settings.drawFeedBannerHint}
          </p>
        </div>
        <Link
          href="/welcome?draw=1"
          className="shrink-0 rounded-full bg-rimvio-neon-purple px-3 py-2 text-[11px] font-bold text-white"
        >
          {copy.settings.drawFeedBannerCta}
        </Link>
        <button
          type="button"
          aria-label={copy.common.close}
          onClick={() => {
            dismissAvatarDrawBanner();
            setVisible(false);
          }}
          className="shrink-0 px-1 text-lg leading-none text-muted-foreground/70"
        >
          ×
        </button>
      </div>
    </div>
  );
}
