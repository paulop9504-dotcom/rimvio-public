import type { CaptureIntent } from "@/lib/capture/capture-intent-types";
import type { CaptureVisionResult } from "@/lib/capture/inferred-intent-types";

export const CAPTURE_INTENT_UPDATED = "rimvio:capture-intent-updated";

const STORAGE_KEY = "rimvio:capture-intent";
const STALE_MS = 5 * 60 * 1000;

type StoredCaptureSession = {
  intent: CaptureIntent;
  captureVision?: CaptureVisionResult | null;
  at: number;
};

export function setCaptureIntent(
  intent: CaptureIntent,
  captureVision?: CaptureVisionResult | null
) {
  if (typeof window === "undefined") {
    return;
  }

  const payload: StoredCaptureSession = {
    intent,
    captureVision: captureVision ?? null,
    at: Date.now(),
  };

  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  window.dispatchEvent(new Event(CAPTURE_INTENT_UPDATED));
}

export function readCaptureSession(now = Date.now()): StoredCaptureSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as StoredCaptureSession;
    if (!parsed.intent?.kind || now - parsed.at > STALE_MS) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }

    return parsed;
  } catch {
    sessionStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function readCaptureIntent(now = Date.now()): CaptureIntent | null {
  return readCaptureSession(now)?.intent ?? null;
}

export function readCaptureVision(now = Date.now()): CaptureVisionResult | null {
  return readCaptureSession(now)?.captureVision ?? null;
}

export function clearCaptureIntent() {
  if (typeof window === "undefined") {
    return;
  }

  sessionStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event(CAPTURE_INTENT_UPDATED));
}

/** @deprecated use setCaptureIntent */
export function setCapturePaymentIntent(intent: {
  accountDisplay: string;
  bankHint: string | null;
  kind: "payment_send";
}) {
  setCaptureIntent({
    kind: "payment_send",
    query: intent.accountDisplay,
    ocrText: intent.accountDisplay,
    accountDisplay: intent.accountDisplay,
    bankHint: intent.bankHint,
  });
}

/** @deprecated use readCaptureIntent */
export function readCapturePaymentIntent(now = Date.now()) {
  const intent = readCaptureIntent(now);
  if (intent?.kind !== "payment_send") {
    return null;
  }

  return {
    kind: "payment_send" as const,
    accountDisplay: intent.accountDisplay ?? intent.query,
    bankHint: intent.bankHint ?? null,
  };
}

export const CAPTURE_PAYMENT_UPDATED = CAPTURE_INTENT_UPDATED;
