"use client";

import { motion } from "framer-motion";
import type { RankedShareDestination } from "@/lib/share/share-destinations";
import { copy } from "@/lib/copy/human-ko";
import { getRankMicrocopy } from "@/lib/share/share-sheet-copy";
import { cn } from "@/lib/utils";

const DESTINATION_ICON_SIZE = "size-[3.75rem]";

type ShareHeroButtonProps = {
  destination: RankedShareDestination;
  onSelect: () => void;
};

export function ShareHeroButton({ destination, onSelect }: ShareHeroButtonProps) {
  const microcopy = getRankMicrocopy(1);

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 28, delay: 0.05 }}
      whileTap={{ scale: 0.98 }}
      onClick={onSelect}
      className={cn(
        "group relative w-full overflow-hidden rounded-[1.35rem] p-[1px]",
        "text-left shadow-[0_16px_40px_-16px_rgba(0,0,0,0.35)]",
        "ring-1 ring-white/10"
      )}
    >
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 bg-gradient-to-br opacity-90",
          destination.gradient
        )}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -right-8 -top-8 size-32 rounded-full bg-rimvio-surface/20 blur-2xl"
      />

      <span className="relative flex items-center gap-3.5 rounded-[1.32rem] bg-background/92 px-4 py-4 backdrop-blur-md">
        <span
          className={cn(
            "flex size-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-2xl shadow-inner",
            destination.gradient,
            destination.ring,
            "ring-2"
          )}
        >
          {destination.emoji}
        </span>

        <span className="min-w-0 flex-1">
          {microcopy ? (
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {microcopy}
            </span>
          ) : null}
          <span className="mt-0.5 block text-[17px] font-semibold tracking-tight text-foreground">
            {destination.verb}
          </span>
          <span className="mt-0.5 block text-xs text-muted-foreground">
            {destination.label} · {copy.share.honeycombHint}
          </span>
        </span>

        <span
          aria-hidden
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-foreground text-lg text-background transition-transform group-active:translate-x-0.5"
        >
          →
        </span>
      </span>
    </motion.button>
  );
}

type ShareDestinationRowProps = {
  destinations: RankedShareDestination[];
  onSelect: (destination: RankedShareDestination) => void;
};

/** Ranks 2–5 — horizontal row of large tap targets (iOS share-sheet style). */
export function ShareDestinationRow({
  destinations,
  onSelect,
}: ShareDestinationRowProps) {
  const items = destinations.filter((item) => item.rank > 1);

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="-mx-5 overflow-x-auto px-5 pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="flex min-w-min gap-5">
        {items.map((destination, index) => (
          <motion.button
            key={destination.id}
            type="button"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: 0.06 + index * 0.04,
              type: "spring",
              stiffness: 420,
              damping: 28,
            }}
            whileTap={{ scale: 0.94 }}
            onClick={() => onSelect(destination)}
            className="flex w-[4.75rem] shrink-0 flex-col items-center gap-2"
            aria-label={`${destination.label} ${destination.verb}`}
          >
            <span
              className={cn(
                "flex items-center justify-center rounded-2xl bg-gradient-to-br text-2xl shadow-sm ring-2",
                DESTINATION_ICON_SIZE,
                destination.gradient,
                destination.ring
              )}
            >
              {destination.emoji}
            </span>
            <span className="w-full truncate text-center text-xs font-medium leading-tight text-foreground">
              {destination.label}
            </span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

/** @deprecated Use ShareDestinationRow */
export const ShareOrbitCluster = ShareDestinationRow;

/** @deprecated Use ShareHeroButton + ShareDestinationRow */
export function ShareHoneycomb({
  destinations,
  onSelect,
}: {
  destinations: RankedShareDestination[];
  onSelect: (destination: RankedShareDestination) => void;
}) {
  const primary = destinations.find((item) => item.rank === 1);
  const rest = destinations.filter((item) => item.rank > 1);

  return (
    <div className="flex flex-col gap-3">
      {primary ? (
        <ShareHeroButton
          destination={primary}
          onSelect={() => onSelect(primary)}
        />
      ) : null}
      <ShareDestinationRow destinations={rest} onSelect={onSelect} />
    </div>
  );
}
