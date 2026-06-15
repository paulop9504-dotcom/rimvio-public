/** Batch high-frequency gesture writes to one commit per animation frame. */
export function createGestureUpdateCoalescer<T>(onFlush: (value: T) => void) {
  let raf: number | null = null;
  let pending: T | null = null;

  return {
    push(value: T) {
      pending = value;
      if (raf != null) {
        return;
      }
      raf = requestAnimationFrame(() => {
        raf = null;
        if (pending !== null) {
          const next = pending;
          pending = null;
          onFlush(next);
        }
      });
    },
    flushNow() {
      if (raf != null) {
        cancelAnimationFrame(raf);
        raf = null;
      }
      if (pending !== null) {
        const next = pending;
        pending = null;
        onFlush(next);
      }
    },
    cancel() {
      if (raf != null) {
        cancelAnimationFrame(raf);
        raf = null;
      }
      pending = null;
    },
  };
}
