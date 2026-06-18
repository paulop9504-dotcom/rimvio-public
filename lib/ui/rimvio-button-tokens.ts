import { RIMVIO_NEON } from "@/lib/brand/rimvio-neon-theme";

/** Rimvio master button — neon tactile system */
export const RIMVIO_BUTTON = {
  blue: RIMVIO_NEON.primaryBtn,
  bluePressed: RIMVIO_NEON.primaryBtnPressed,
  white: RIMVIO_NEON.text,
  ink: RIMVIO_NEON.text,
  inkMuted: RIMVIO_NEON.textMuted,
  radius: 14,
  radiusSm: 12,
  easing: "cubic-bezier(0.4, 0, 0.2, 1)",
  durationMs: 200,
  shadowRest:
    "0px 2px 8px rgba(147, 51, 234, 0.18), 0px 12px 28px rgba(0, 0, 0, 0.35)",
  shadowPressed:
    "0px 1px 4px rgba(147, 51, 234, 0.12), 0px 6px 14px rgba(0, 0, 0, 0.28)",
  glassBg: "rgba(20, 20, 28, 0.82)",
  glassBorder: "rgba(168, 85, 247, 0.22)",
} as const;
