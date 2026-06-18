"use client";

import { sanitizeLinkTitle } from "@/lib/feed/sanitize-link-title";
import type { LinkRow } from "@/types/database";
import { cn } from "@/lib/utils";

type HomeRecentRowProps = {
  links: LinkRow[];
  activeIndex: number;
  onSelect: (index: number) => void;
  className?: string;
};

function recentChipLabel(link: LinkRow): string {
  return sanitizeLinkTitle(link);
}

export function HomeRecentRow({ links, activeIndex, onSelect, className }: HomeRecentRowProps) {
  const recent = links.slice(0, 8);
  if (recent.length === 0) {
    return null;
  }

  return (
    <section className={cn("px-4 pb-2", className)} aria-label="최근 실행">
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        최근 실행
      </p>
      <div className="flex gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {recent.map((link) => {
          const index = links.findIndex((entry) => entry.id === link.id);
          const active = index === activeIndex;
          const title = recentChipLabel(link);
          return (
            <button
              key={link.id}
              type="button"
              onClick={() => onSelect(index)}
              className={cn(
                "max-w-[8rem] shrink-0 truncate rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
                active
                  ? "bg-rimvio-neon-purple text-white"
                  : "bg-rimvio-surface-muted text-muted-foreground hover:bg-rimvio-surface-raised",
              )}
            >
              {title.slice(0, 18)}
            </button>
          );
        })}
      </div>
    </section>
  );
}
