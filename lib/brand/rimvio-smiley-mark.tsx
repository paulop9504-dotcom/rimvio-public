import { cn } from "@/lib/utils";
import {
  getAvatarColors,
  getAvatarVariant,
  type RimvioAvatarColors,
  type RimvioAvatarVariantId,
} from "@/lib/brand/rimvio-avatar-colors";

export { RIMVIO_LOGO_SRC } from "@/lib/brand/rimvio-logo-src";

const DEFAULT_COLORS = getAvatarColors("purple");
export const PENDING_AVATAR_COLORS: RimvioAvatarColors = {
  eyeRing: "#D4D4D8",
  pupil: "#71717A",
  smile: "#A1A1AA",
};

function resolveColors(variant: RimvioAvatarVariantId | null | undefined) {
  if (!variant) {
    return PENDING_AVATAR_COLORS;
  }

  return getAvatarColors(variant);
}

/** Unified Rimvio smiley — circle face, ring eyes, curved smile. */
export function RimvioSmileyMark({
  pixels,
  className,
  crisp = false,
  colors,
  variant = null,
  testId,
}: {
  pixels?: number;
  className?: string;
  /** Slightly bolder strokes for small nav icons. */
  crisp?: boolean;
  colors?: RimvioAvatarColors;
  variant?: RimvioAvatarVariantId | null;
  testId?: string;
}) {
  const resolvedColors = colors ?? resolveColors(variant);
  const border = crisp ? 2.35 : 2;
  const eyeRing = crisp ? 2.05 : 1.85;
  const smileWidth = crisp ? 2.25 : 2.1;

  return (
    <svg
      viewBox="0 0 56 56"
      {...(pixels ? { width: pixels, height: pixels } : {})}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      data-testid={testId}
      className={cn("shrink-0", pixels ? undefined : "size-full", className)}
      shapeRendering="geometricPrecision"
      aria-hidden
    >
      <circle
        cx="28"
        cy="28"
        r="26"
        fill="#FFFFFF"
        stroke="#3F3F46"
        strokeWidth={border}
      />
      <circle
        cx="18.5"
        cy="23.5"
        r="6.2"
        fill="none"
        stroke={resolvedColors.eyeRing}
        strokeWidth={eyeRing}
      />
      <circle cx="18.5" cy="23.5" r="2.35" fill={resolvedColors.pupil} />
      <circle
        cx="37.5"
        cy="23.5"
        r="6.2"
        fill="none"
        stroke={resolvedColors.eyeRing}
        strokeWidth={eyeRing}
      />
      <circle cx="37.5" cy="23.5" r="2.35" fill={resolvedColors.pupil} />
      <path
        d="M15.5 34.5 Q28 43.5 40.5 34.5"
        stroke={resolvedColors.smile}
        strokeWidth={smileWidth}
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

export function RimvioAvatarMark({
  variant = null,
  pixels = 56,
  className,
  crisp = false,
}: {
  variant?: RimvioAvatarVariantId | null;
  pixels?: number;
  className?: string;
  crisp?: boolean;
}) {
  return (
    <RimvioSmileyMark
      pixels={pixels}
      crisp={crisp}
      variant={variant}
      className={className}
    />
  );
}

export function labelForAvatarVariant(variant: RimvioAvatarVariantId) {
  return getAvatarVariant(variant).labelKo;
}

/** Static SVG string for public assets (512 / 128 / wordmark). */
export const RIMVIO_SMILEY_SVG_INNER = `
  <circle cx="28" cy="28" r="26" fill="#FFFFFF" stroke="#3F3F46" stroke-width="2"/>
  <circle cx="18.5" cy="23.5" r="6.2" fill="none" stroke="#C084FC" stroke-width="1.85"/>
  <circle cx="18.5" cy="23.5" r="2.35" fill="#5B21B6"/>
  <circle cx="37.5" cy="23.5" r="6.2" fill="none" stroke="#C084FC" stroke-width="1.85"/>
  <circle cx="37.5" cy="23.5" r="2.35" fill="#5B21B6"/>
  <path d="M15.5 34.5 Q28 43.5 40.5 34.5" stroke="#C084FC" stroke-width="2.1" stroke-linecap="round" fill="none"/>
`;
