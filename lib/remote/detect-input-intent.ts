/** Clipboard / paste text → structured intent for contextual remote. */

export type ClipboardPaymentIntent = {
  kind: "payment_send";
  accountDisplay: string;
  bankHint: string | null;
};

export type ClipboardIntent =
  | ClipboardPaymentIntent
  | { kind: "url"; url: string }
  | { kind: "unknown" };

const BANK_PATTERN =
  /(국민|신한|우리|하나|카카오|토스|농협|기업|SC|씨티|KB|IBK|NH|새마을|우체국|수협|케이|K뱅크|카카오뱅크|토스뱅크)/i;

const ACCOUNT_PATTERN =
  /\b(\d{3,4}[-\s]?\d{2,6}[-\s]?\d{2,8})\b|\b(\d{10,14})\b/;

export function detectPaymentFromText(raw: string): ClipboardPaymentIntent | null {
  const text = raw.replace(/\s+/g, " ").trim();
  if (!text || text.length > 800) {
    return null;
  }

  const accountMatch = text.match(ACCOUNT_PATTERN);
  if (!accountMatch) {
    return null;
  }

  const accountDisplay = (accountMatch[1] ?? accountMatch[2] ?? "").replace(/\s/g, "");
  if (accountDisplay.length < 10) {
    return null;
  }

  if (/^010\d{8}$/.test(accountDisplay.replace(/-/g, ""))) {
    return null;
  }

  if (/^20\d{2}[-./]?\d{1,2}[-./]?\d{1,2}$/.test(accountDisplay)) {
    return null;
  }

  const bankMatch = text.match(BANK_PATTERN);
  if (!bankMatch && !/^\d{3,4}-\d{2,6}-\d{2,8}$/.test(accountDisplay)) {
    return null;
  }

  return {
    kind: "payment_send",
    accountDisplay,
    bankHint: bankMatch?.[1] ?? null,
  };
}

export function detectClipboardIntent(raw: string | null | undefined): ClipboardIntent | null {
  if (!raw?.trim()) {
    return null;
  }

  const payment = detectPaymentFromText(raw);
  if (payment) {
    return payment;
  }

  const urlMatch = raw.match(/https?:\/\/[^\s]+/i);
  if (urlMatch) {
    return { kind: "url", url: urlMatch[0] };
  }

  return { kind: "unknown" };
}
