import type { GlobeInstance } from "globe.gl";

export const GLOBE_IDLE_AFTER_MS = 3_500;

export type GlobeAnimationPowerMode = "full" | "suspended";

type GlobeWithAnimation = GlobeInstance & {
  pauseAnimation?: () => void;
  resumeAnimation?: () => void;
};

/** Pause/resume only — no idle frame pulse (corrupted WebGL tile uploads). */
export function applyGlobeAnimationPower(
  globe: GlobeInstance | null | undefined,
  mode: GlobeAnimationPowerMode,
): void {
  if (!globe) {
    return;
  }
  const g = globe as GlobeWithAnimation;
  if (mode === "full") {
    g.resumeAnimation?.();
    return;
  }
  g.pauseAnimation?.();
}
