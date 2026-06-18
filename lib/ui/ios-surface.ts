import { cn } from "@/lib/utils";
import {
  rimvioEdgeCardClass,
  rimvioNeonCardClass,
  rimvioNeonCardSmClass,
  RIMVIO_NEON,
} from "@/lib/brand/rimvio-neon-theme";

/** Shared grouped-list surfaces — light canvas + soft blurple accents. */
export const IOS = {
  bg: "bg-rimvio-base",
  card: rimvioNeonCardClass,
  cardSm: rimvioNeonCardSmClass,
  cardCyan: rimvioEdgeCardClass("sm", "cyan"),
  cardMagenta: rimvioEdgeCardClass("sm", "magenta"),
  cardGreen: rimvioEdgeCardClass("sm", "green"),
  sectionLabel:
    "text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground/80",
  primaryBtn: cn(
    "flex h-[50px] w-full items-center justify-center rounded-[12px]",
    "bg-primary text-[17px] font-semibold text-primary-foreground",
    "shadow-[0_4px_14px_rgba(88,101,242,0.28)]",
    "transition-transform active:scale-[0.98] hover:bg-[#4752c4]",
  ),
  secondaryBtn: cn(
    "inline-flex items-center justify-center rounded-[12px]",
    "bg-secondary text-[15px] font-medium text-secondary-foreground",
    "shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]",
    "transition-transform active:scale-[0.98] hover:bg-accent",
  ),
  pillActive: "bg-primary text-primary-foreground shadow-[0_2px_8px_rgba(88,101,242,0.22)]",
  pillIdle:
    "bg-secondary text-secondary-foreground shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]",
  input: cn(
    "rounded-xl bg-secondary px-4 py-3 text-foreground",
    "shadow-none ring-1 ring-border/60",
    "focus-within:ring-2 focus-within:ring-primary/35",
  ),
} as const;

export const IOS_HEX = {
  bg: RIMVIO_NEON.base,
  card: RIMVIO_NEON.surface,
} as const;
