const SAMPLE_WINDOW_MS = 110;
const MAX_SAMPLES = 6;

type Sample = { t: number; dx: number; dy: number };

/** Recent pointer deltas → release velocity for inertial pan. */
export class GestureVelocityTracker {
  private samples: Sample[] = [];

  reset() {
    this.samples = [];
  }

  record(deltaX: number, deltaY: number, now = performance.now()) {
    this.samples.push({ t: now, dx: deltaX, dy: deltaY });
    while (
      this.samples.length > MAX_SAMPLES ||
      (this.samples.length > 1 &&
        now - this.samples[0]!.t > SAMPLE_WINDOW_MS)
    ) {
      this.samples.shift();
    }
  }

  velocity(): { vx: number; vy: number } {
    if (this.samples.length === 0) {
      return { vx: 0, vy: 0 };
    }
    const first = this.samples[0]!;
    const last = this.samples[this.samples.length - 1]!;
    const dt = Math.max(8, last.t - first.t);
    let sumDx = 0;
    let sumDy = 0;
    for (const sample of this.samples) {
      sumDx += sample.dx;
      sumDy += sample.dy;
    }
    const scale = 16 / dt;
    return { vx: sumDx * scale, vy: sumDy * scale };
  }
}

/** Exponential decay — returns false when motion is negligible. */
export function applyInertialDecay(
  velocity: { vx: number; vy: number },
  friction = 0.92,
): { vx: number; vy: number; active: boolean } {
  const vx = velocity.vx * friction;
  const vy = velocity.vy * friction;
  const active = Math.hypot(vx, vy) > 0.35;
  return { vx, vy, active };
}
