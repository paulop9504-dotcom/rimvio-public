import { cn } from "@/lib/utils";
import { RIMVIO_CANVAS, RIMVIO_LOGO_ICON_BG } from "@/lib/brand/rimvio-logo-src";

/**
 * Retro Raincloud — dusty periwinkle shell + readable charcoal ink.
 */
export const RIMVIO_NEON = {
  canvas: RIMVIO_LOGO_ICON_BG,
  base: "#ffffff",
  surface: "#ffffff",
  surfaceMuted: "#f2f3f5",
  surfaceRaised: "#ebedef",
  border: "rgba(6, 6, 7, 0.08)",
  borderSubtle: "rgba(6, 6, 7, 0.05)",
  purple: "#5865f2",
  purpleDeep: "#4752c4",
  cyan: "#00a8fc",
  cyanDeep: "#0086c9",
  magenta: "#e3717d",
  amber: "#faa81a",
  green: "#23a559",
  text: "#060607",
  textMuted: "#4e5058",
  textDim: "#6d7178",
  primaryBtn: "#5865f2",
  primaryBtnPressed: "#4752c4",
  focusRing: "rgba(88, 101, 242, 0.45)",
} as const;

export type RimvioEdgeVariant = "default" | "cyan" | "magenta" | "amber" | "green";

const EDGE_VARIANT_CLASS: Record<RimvioEdgeVariant, string> = {
  default: "",
  cyan: "rimvio-edge-card--cyan",
  magenta: "rimvio-edge-card--magenta",
  amber: "rimvio-edge-card--amber",
  green: "rimvio-edge-card--green",
};

/** Logo tile — prismatic edge only; mark blends with page canvas. */
export const rimvioLogoFrameClass = cn(
  "rimvio-edge-card rimvio-edge-card--logo rounded-2xl bg-transparent p-1",
  "shadow-[0_4px_18px_rgba(88,101,242,0.12)]",
);

export const rimvioNeonWordmarkClass = cn(
  "bg-gradient-to-r from-[#5865f2] via-[#00a8fc] to-[#5865f2]",
  "bg-clip-text text-transparent",
);

export function rimvioEdgeCardClass(
  size: "sm" | "lg" = "lg",
  variant: RimvioEdgeVariant = "default",
) {
  return cn(
    "rimvio-edge-card",
    size === "lg" ? "rimvio-edge-card--lg" : "rimvio-edge-card--sm",
    EDGE_VARIANT_CLASS[variant],
  );
}

export const rimvioNeonCardClass = rimvioEdgeCardClass("lg");
export const rimvioNeonCardSmClass = rimvioEdgeCardClass("sm");

/** Sticky chrome — soft divider on light canvas. */
export const rimvioHeaderChromeClass =
  "rimvio-header-chrome border-b border-border/70 bg-rimvio-base/92 backdrop-blur-xl";

/** Bottom tab bar — frosted light panel. */
export const rimvioNavBarClass =
  "rimvio-nav-bar border-t border-border/70 bg-rimvio-base/95 backdrop-blur-xl";

export type RimvioIconBtnVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "cyan"
  | "magenta"
  | "green";

const ICON_BTN_VARIANT: Record<RimvioIconBtnVariant, string> = {
  primary: "rimvio-icon-btn--primary",
  secondary: "rimvio-icon-btn--secondary",
  ghost: "rimvio-icon-btn--ghost",
  cyan: "rimvio-icon-btn--cyan",
  magenta: "rimvio-icon-btn--magenta",
  green: "rimvio-icon-btn--green",
};

/** Circular icon control (+ / mic / send / close). */
export function rimvioIconBtnClass(
  variant: RimvioIconBtnVariant = "primary",
  size: "md" | "sm" = "md",
) {
  return cn(
    "rimvio-icon-btn",
    size === "sm" && "rimvio-icon-btn--sm",
    ICON_BTN_VARIANT[variant],
  );
}

export type RimvioMenuTileAccent = "cyan" | "purple" | "magenta" | "green";

const MENU_TILE_ACCENT: Record<RimvioMenuTileAccent, string> = {
  cyan: "rimvio-menu-tile--cyan",
  purple: "rimvio-menu-tile--purple",
  magenta: "rimvio-menu-tile--magenta",
  green: "rimvio-menu-tile--green",
};

/** Capture menu grid shell. */
export const rimvioMenuGridClass =
  "rimvio-menu-grid mb-2 grid grid-cols-4 gap-2 rounded-[16px] p-2.5";

/** One tile inside the capture menu. */
export function rimvioMenuTileBtnClass(accent: RimvioMenuTileAccent) {
  return cn("rimvio-menu-tile", MENU_TILE_ACCENT[accent]);
}

/** Composer text field inset on black chrome. */
export const rimvioComposerFieldClass = "rimvio-composer-field";

/** Pill / chip toggle on black canvas. */
export function rimvioChipBtnClass(active = false) {
  return cn("rimvio-chip-btn", active && "rimvio-chip-btn--active");
}

/** Full-width list pick row (location, options). */
export function rimvioListPickBtnClass(recommended = false) {
  return cn("rimvio-list-pick-btn", recommended && "rimvio-list-pick-btn--recommended");
}

/** Inline @mention chip shell — dark OS unified. */
export function rimvioInlineChipClass(
  size: "sm" | "md" | "lg" | "inline" = "md",
) {
  return cn(
    "rimvio-inline-chip",
    size === "sm" && "rimvio-inline-chip--sm",
    size === "md" && "rimvio-inline-chip--md",
    size === "lg" && "rimvio-inline-chip--lg",
    size === "inline" && "rimvio-inline-chip--inline",
  );
}

export const rimvioInlineChipHeaderClass = "rimvio-inline-chip__header";
export const rimvioInlineChipBodyClass = "rimvio-inline-chip__body";
export const rimvioInlineChipTitleClass = "rimvio-inline-chip__title";
export const rimvioInlineChipMetaClass = "rimvio-inline-chip__meta";
export const rimvioStripLinkBtnClass = "rimvio-strip-link-btn";
