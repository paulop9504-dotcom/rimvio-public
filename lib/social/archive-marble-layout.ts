/** Deterministic stack offsets for 구슬 주머니 pile (%, relative to container). */
export type MarbleStackPlacement = {
  leftPct: number;
  topPct: number;
  zIndex: number;
  scale: number;
};

const GOLDEN_ANGLE_RAD = (137.508 * Math.PI) / 180;

export function marbleStackPlacement(
  index: number,
  _total: number,
): MarbleStackPlacement {
  const angle = index * GOLDEN_ANGLE_RAD;
  const ring = Math.floor(index / 6);
  const radius = 10 + ring * 9 + (index % 6) * 2.2;
  const leftPct = 50 + Math.cos(angle) * radius * 0.42;
  const topPct = 50 + Math.sin(angle) * radius * 0.38;
  const scale = Math.max(0.72, 1 - index * 0.028);

  return {
    leftPct,
    topPct,
    zIndex: index + 1,
    scale,
  };
}
