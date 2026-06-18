import { RimvioBrandMark } from "@/lib/brand/rimvio-brand-mark";
import {
  RIMVIO_NAV_ICON_BOX_PX,
  RIMVIO_NAV_LOGO_HEIGHT_PX,
} from "@/lib/brand/rimvio-logo-src";
import type { RimvioAvatarVariantId } from "@/lib/brand/rimvio-avatar-colors";

/** Feed tab icon — transparent brand mark sized for nav rail. */
export function RimvioFeedMark({
  className,
  filled = true,
  variant = null,
  testId = "rimvio-feed-mark",
  nav = false,
}: {
  className?: string;
  filled?: boolean;
  variant?: RimvioAvatarVariantId | null;
  testId?: string;
  /** Tab bar — match Lucide icon cap height */
  nav?: boolean;
}) {
  return (
    <RimvioBrandMark
      crisp
      size={nav ? RIMVIO_NAV_ICON_BOX_PX : RIMVIO_NAV_LOGO_HEIGHT_PX}
      sizeAxis="height"
      dimmed={!filled}
      variant={variant}
      testId={testId}
      className={className}
    />
  );
}
