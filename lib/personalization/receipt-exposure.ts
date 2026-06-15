type ReceiptExposure = {
  shownAt: number;
  getDwellMs: () => number;
};

const exposureByLink = new Map<string, ReceiptExposure>();

export function registerReceiptExposure(
  linkId: string,
  exposure: ReceiptExposure
) {
  exposureByLink.set(linkId, exposure);
}

export function clearReceiptExposure(linkId: string) {
  exposureByLink.delete(linkId);
}

export function readReceiptExposure(linkId: string) {
  return exposureByLink.get(linkId) ?? null;
}

export function readReceiptTiming(linkId: string) {
  const exposure = readReceiptExposure(linkId);
  if (!exposure) {
    return {
      dwell_time_ms: null as number | null,
      time_to_action_ms: null as number | null,
      receipt_visible: false,
    };
  }

  return {
    dwell_time_ms: exposure.getDwellMs(),
    time_to_action_ms: Date.now() - exposure.shownAt,
    receipt_visible: true,
  };
}
