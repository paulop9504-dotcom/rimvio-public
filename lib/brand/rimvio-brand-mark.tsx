import { cn } from "@/lib/utils";
import {
  RIMVIO_LOGO_ASPECT,
  RIMVIO_LOGO_MARK_SRC,
  RIMVIO_LOGO_WHITE_SRC,
} from "@/lib/brand/rimvio-logo-src";
import type { RimvioAvatarVariantId } from "@/lib/brand/rimvio-avatar-colors";

export { RIMVIO_LOGO_MARK_SRC as RIMVIO_LOGO_SRC } from "@/lib/brand/rimvio-logo-src";

/** Shared brand mark — Rimvio hand / neural logo. */
export function RimvioBrandMark({
  className,
  size,
  sizeAxis = "width",
  dimmed = false,
  crisp: _crisp = false,
  appearance = "dark",
  variant: _variant = null,
  testId,
}: {
  className?: string;
  size?: number;
  /** `width` = size is mark width; `height` = size is cap height (nav rail alignment). */
  sizeAxis?: "width" | "height";
  dimmed?: boolean;
  crisp?: boolean;
  /** `dark` = colorful; `white` = white on dark chrome; `light` = black on white chrome. */
  appearance?: "dark" | "white" | "light";
  variant?: RimvioAvatarVariantId | null;
  testId?: string;
}) {
  const box = size ?? undefined;
  const width =
    box && sizeAxis === "height" ? Math.round(box * RIMVIO_LOGO_ASPECT) : box;
  const height =
    box && sizeAxis === "height"
      ? box
      : box
        ? Math.round(box / RIMVIO_LOGO_ASPECT)
        : undefined;

  return (
    <span
      data-testid={testId}
      className={cn(
        "rimvio-brand-mark inline-flex shrink-0 items-center justify-center overflow-visible bg-transparent",
        !box && "size-full",
        className,
      )}
      style={box ? { width, height } : undefined}
      aria-hidden
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={appearance === "white" ? RIMVIO_LOGO_WHITE_SRC : RIMVIO_LOGO_MARK_SRC}
        alt=""
        width={width}
        height={height}
        draggable={false}
        decoding="async"
        className={cn(
          "rimvio-brand-mark__img max-h-full max-w-full object-contain",
          appearance === "light" && "rimvio-brand-mark__img--on-light",
          dimmed && "opacity-45 saturate-[0.85]",
        )}
      />
    </span>
  );
}
