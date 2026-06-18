export type TicketScanSurfaceHandle = {
  release: () => void;
};

/**
 * QR/barcode scan surface — wake lock + high-luminance UI class.
 * System brightness API is not available on iOS Safari; wake lock + white fullscreen is best-effort.
 */
export async function acquireTicketScanSurface(): Promise<TicketScanSurfaceHandle> {
  if (typeof document !== "undefined") {
    document.documentElement.classList.add("rimvio-ticket-scan-surface");
  }

  let wakeLock: WakeLockSentinel | null = null;
  if (typeof navigator !== "undefined" && "wakeLock" in navigator) {
    try {
      wakeLock = await navigator.wakeLock.request("screen");
    } catch {
      /* permission or unsupported — non-blocking */
    }
  }

  return {
    release() {
      if (typeof document !== "undefined") {
        document.documentElement.classList.remove("rimvio-ticket-scan-surface");
      }
      void wakeLock?.release().catch(() => undefined);
      wakeLock = null;
    },
  };
}

export function isTicketQrViewerHref(href: string): boolean {
  const trimmed = href.trim();
  if (!trimmed) {
    return false;
  }
  if (trimmed.startsWith("blob:") || trimmed.startsWith("data:image")) {
    return true;
  }
  return /\.(png|jpe?g|webp|gif)(\?|$)/i.test(trimmed);
}
