/** Map-anchored photo / video / lodging cards — pin locks below center so media sits lower. */

/** 0 = card bottom at pin, 1 = card top at pin. ~0.55 keeps context point in the lower half. */
export const MAP_OVERLAY_ANCHOR_FRACTION = 0.55;

/** Lodging focus hero (4:5) — slightly lower anchor. */
export const MAP_LODGING_FOCUS_ANCHOR_FRACTION = 0.5;

export const MAP_OVERLAY_ANCHOR_GAP_PX = 12;

export function mapAnchoredOverlayTransform(
  anchorFraction: number = MAP_OVERLAY_ANCHOR_FRACTION,
  gapPx: number = MAP_OVERLAY_ANCHOR_GAP_PX,
): string {
  const pct = Math.round(anchorFraction * 1000) / 10;
  return `translate(-50%, calc(-${pct}% - ${gapPx}px))`;
}

/** Target pin position on viewport — 0.5 center, ~0.58 lower (easier to read overlays). */
export const MAP_FOCUS_PIN_VIEWPORT_Y = 0.58;

export function resolveGlobeOffsetForPinViewportY(input: {
  viewportHeight: number;
  pinViewportY?: number;
}): [number, number] {
  const target = input.pinViewportY ?? 0.5;
  if (!Number.isFinite(target) || Math.abs(target - 0.5) < 0.02) {
    return [0, 0];
  }
  const biasPx = Math.round((target - 0.5) * input.viewportHeight);
  return [0, -biasPx];
}
