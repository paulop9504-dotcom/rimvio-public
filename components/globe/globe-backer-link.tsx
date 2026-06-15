"use client";

import { HeartHandshake } from "lucide-react";
import { useCopy } from "@/hooks/use-copy";
import { buildRimvioBackerMailtoUrl } from "@/lib/globe/rimvio-backer-contact";
import { cn } from "@/lib/utils";

export type GlobeBackerLinkProps = {
  className?: string;
};

/** Globe top-left — mailto deep link for support · investment inquiries. */
export function GlobeBackerLink({ className }: GlobeBackerLinkProps) {
  const copy = useCopy();
  const href = buildRimvioBackerMailtoUrl({ kind: "invest" });

  return (
    <a
      href={href}
      className={cn(
        "inline-flex max-w-[min(100%,12.75rem)] items-center gap-1.5 rounded-full bg-card/95 px-3 py-2 text-[11px] font-semibold text-foreground shadow-sm ring-1 ring-border backdrop-blur-md active:scale-[0.98]",
        className,
      )}
      aria-label={copy.globe.backerLinkAria}
      data-globe-backer-link
    >
      <HeartHandshake className="size-3.5 shrink-0 text-primary" aria-hidden />
      <span className="truncate">{copy.globe.backerLinkLabel}</span>
    </a>
  );
}
