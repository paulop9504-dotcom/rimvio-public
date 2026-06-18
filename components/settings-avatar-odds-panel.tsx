"use client";

import { useCallback, useEffect, useState } from "react";
import { RimvioAvatarMark } from "@/lib/brand/rimvio-smiley-mark";
import {
  listAvatarOddsDisplay,
  oddsHumanLine,
  getAvatarVariant,
  type RimvioAvatarVariantId,
} from "@/lib/brand/rimvio-avatar-colors";
import { useCopy } from "@/hooks/use-copy";
import { IOS } from "@/lib/ui/ios-surface";
import { getRoomGuest, ROOM_GUEST_UPDATED } from "@/lib/rooms/guest-session";
import { cn } from "@/lib/utils";

type SettingsAvatarOddsPanelProps = {
  className?: string;
};

export function SettingsAvatarOddsPanel({ className }: SettingsAvatarOddsPanelProps) {
  const copy = useCopy();
  const odds = listAvatarOddsDisplay();
  const [activeVariant, setActiveVariant] = useState<RimvioAvatarVariantId | null>(null);
  const [avatarDrawn, setAvatarDrawn] = useState(false);

  const sync = useCallback(() => {
    const guest = getRoomGuest();
    setActiveVariant(guest.avatarVariant);
    setAvatarDrawn(guest.avatarDrawn);
  }, []);

  useEffect(() => {
    sync();
    const onUpdate = () => sync();
    window.addEventListener(ROOM_GUEST_UPDATED, onUpdate);
    return () => window.removeEventListener(ROOM_GUEST_UPDATED, onUpdate);
  }, [sync]);

  return (
    <section className={cn("p-4", IOS.cardSm, className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">{copy.settings.oddsTitle}</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {copy.settings.oddsHint}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-violet-500/10 px-2.5 py-1 text-[10px] font-bold text-violet-700 ring-1 ring-violet-500/20">
          {copy.settings.oddsBadge}
        </span>
      </div>

      <p className="mt-2 text-center text-[10px] font-medium text-muted-foreground/80">
        {avatarDrawn ? copy.settings.oddsScrollHint : copy.settings.oddsPending}
      </p>

      <ul className="mt-3 space-y-2.5">
        {odds.map((row) => {
          const active = avatarDrawn && row.id === activeVariant;
          const variant = getAvatarVariant(row.id);

          return (
            <li
              key={row.id}
              className={cn(
                "rounded-2xl px-3 py-2.5 ring-1 transition-colors",
                row.isUltraRare
                  ? "bg-gradient-to-r from-violet-500/10 via-fuchsia-500/10 to-violet-500/5 ring-violet-400/35"
                  : "bg-rimvio-surface-muted/80 ring-rimvio-neon-purple/12",
                active && "ring-2 ring-[#007AFF]/50"
              )}
            >
              <div className="flex items-center gap-2.5">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-rimvio-surface p-0.5 shadow-sm">
                  <RimvioAvatarMark variant={row.id} pixels={30} crisp />
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold">
                      {row.tierEmoji} {row.labelKo} 글?�고
                    </span>
                    {active ? (
                      <span className="rounded-full bg-rimvio-neon-purple px-1.5 py-0.5 text-[9px] font-bold text-white">
                        {copy.settings.oddsMine}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    {row.tierKo}
                    {row.isUltraRare ? ` · ${copy.settings.oddsUltraRare}` : ""}
                  </p>
                </div>

                <div className="shrink-0 text-right">
                  <p className="text-sm font-bold tabular-nums">{row.weight}%</p>
                  <p className="text-[10px] text-muted-foreground">
                    {oddsHumanLine(variant)}
                  </p>
                </div>
              </div>

              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/[0.06]">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${row.weight}%`,
                    backgroundColor: row.accent,
                  }}
                />
              </div>
            </li>
          );
        })}
      </ul>

      <p className="mt-3 text-center text-[11px] leading-relaxed text-muted-foreground">
        {copy.settings.oddsFooter}
      </p>
    </section>
  );
}
