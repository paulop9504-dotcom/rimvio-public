/** Master brand logo — neon hand mark (1024×1024 source PNG). */
export const RIMVIO_LOGO_SRC = "/brand/rimvio-logo-source.png";

/** UI mark — transparent plate for nav / feed / headers. */
export const RIMVIO_LOGO_TRANSPARENT_SRC = "/brand/rimvio-logo-transparent.png";

/** White silhouette — transparent plate, for dark header chrome. */
export const RIMVIO_LOGO_WHITE_SRC = "/brand/rimvio-logo-white.png";

/** Default in-app mark (transparent). Source kept for PWA icon baking. */
export const RIMVIO_LOGO_MARK_SRC = RIMVIO_LOGO_TRANSPARENT_SRC;

/** App canvas — Discord-like light gray. */
export const RIMVIO_CANVAS = "#f2f3f5";

/** Square app icon background — matches screen canvas. */
export const RIMVIO_LOGO_ICON_BG = RIMVIO_CANVAS;

/** Logo aspect ratio (width / height). */
export const RIMVIO_LOGO_ASPECT = 1;

/** Side nav Lucide icons — 1.625rem ≈ 26px at 16px root. */
export const RIMVIO_NAV_ICON_BOX_PX = 26;

/** Feed / brand mark vs nav icon cap height. */
export const RIMVIO_NAV_LOGO_SCALE = 1.1;

/** Feed mark cap height — nav icon box × scale (square mark). */
export const RIMVIO_NAV_LOGO_HEIGHT_PX = Math.round(
  RIMVIO_NAV_ICON_BOX_PX * RIMVIO_NAV_LOGO_SCALE,
);
