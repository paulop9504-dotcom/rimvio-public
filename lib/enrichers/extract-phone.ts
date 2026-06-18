/** Korean / tel: phone extraction for call actions. */

const TEL_HREF_PATTERN = /href=["']tel(?:prompt)?:([^"'#?]+)["']/gi;
const LABELLED_PHONE =
  /(?:전화|연락처|예약(?:문의)?|문의)\s*[:：]?\s*((?:\+?82[\d\s-]{8,14}|0\d{1,2}[\d\s-]{7,12}))/i;
const KR_MOBILE =
  /(?:\+82[\s-]?|0)1[016789][\s-]?\d{3,4}[\s-]?\d{4}\b/;
const KR_LANDLINE =
  /(?:\+82[\s-]?|0)[2-6]\d{0,2}[\s-]?\d{3,4}[\s-]?\d{4}\b/;
const KR_SAFE_NUMBER = /\b050\d[\s-]?\d{4}[\s-]?\d{4}\b/;

function digitsOnly(raw: string) {
  return raw.replace(/[^\d+]/g, "");
}

export function isTelHref(href: string): boolean {
  return /^(tel|telprompt):/i.test(href.trim());
}

/** Local digits for dial-prep (e.g. 0425441162). */
export function extractTelDigits(raw: string): string {
  const cleaned = raw.trim().replace(/^tel(?:prompt)?:/i, "").trim();
  let digits = digitsOnly(cleaned).replace(/^\+/, "");

  if (digits.startsWith("82")) {
    digits = `0${digits.slice(2)}`;
  }

  return digits;
}

export function buildContactActionLabel(phone: string): string {
  const display = formatPhoneDisplay(phone);
  return `연락하기 (${display})`;
}

export function toDialPrepTelHref(
  raw: string,
  platform: "ios" | "android" | "auto" = "auto"
): string {
  const digits = extractTelDigits(raw);
  if (!digits) {
    return "tel:";
  }

  if (platform === "ios") {
    return `telprompt:${digits}`;
  }

  if (platform === "android") {
    return `tel:${digits}`;
  }

  return `tel:${digits}`;
}

export function resolveDialPrepTelHref(storedHref: string): string {
  if (!isTelHref(storedHref)) {
    return storedHref;
  }

  const digits = extractTelDigits(storedHref);
  if (!digits) {
    return storedHref;
  }

  if (typeof navigator !== "undefined" && /iPhone|iPad|iPod/i.test(navigator.userAgent)) {
    return `telprompt:${digits}`;
  }

  return `tel:${digits}`;
}

export function formatPhoneDisplay(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    return trimmed;
  }

  const digits = digitsOnly(trimmed).replace(/^\+/, "");
  if (digits.startsWith("821")) {
    const local = `0${digits.slice(2)}`;
    if (local.length === 11) {
      return `${local.slice(0, 3)}-${local.slice(3, 7)}-${local.slice(7)}`;
    }
  }

  if (digits.startsWith("82") && digits.length >= 10) {
    const local = `0${digits.slice(2)}`;
    if (local.length === 10) {
      return `${local.slice(0, 2)}-${local.slice(2, 6)}-${local.slice(6)}`;
    }
    if (local.length === 11) {
      return `${local.slice(0, 3)}-${local.slice(3, 7)}-${local.slice(7)}`;
    }
  }

  if (/^01[016789]\d{7,8}$/.test(digits)) {
    const local = digits.startsWith("0") ? digits : `0${digits}`;
    return `${local.slice(0, 3)}-${local.slice(3, 7)}-${local.slice(7)}`;
  }

  if (/^0[2-6]\d{7,9}$/.test(digits)) {
    if (digits.startsWith("02") && digits.length === 10) {
      return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6)}`;
    }
    if (digits.length === 10 && /^0[3-6]\d/.test(digits)) {
      return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    if (digits.length === 9) {
      return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`;
    }
    if (digits.length === 10) {
      return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6)}`;
    }
    if (digits.length === 11) {
      return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
    }
  }

  return trimmed.replace(/\s+/g, " ");
}

export function toTelHref(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    return "tel:";
  }

  if (isTelHref(trimmed)) {
    return toDialPrepTelHref(trimmed);
  }

  return toDialPrepTelHref(trimmed);
}

function normalizePhoneCandidate(raw: string | null | undefined): string | null {
  if (!raw?.trim()) {
    return null;
  }

  const cleaned = raw.trim().replace(/^tel(?:prompt)?:/i, "").trim();
  const digits = digitsOnly(cleaned);

  if (digits.startsWith("82")) {
    const localLen = digits.length - 2;
    if (localLen < 8 || localLen > 11) {
      return null;
    }
    return formatPhoneDisplay(cleaned);
  }

  if (digits.startsWith("050")) {
    if (digits.length < 11 || digits.length > 12) {
      return null;
    }
    return formatPhoneDisplay(cleaned);
  }

  if (digits.startsWith("01")) {
    if (digits.length < 10 || digits.length > 11) {
      return null;
    }
    return formatPhoneDisplay(cleaned);
  }

  if (digits.startsWith("0")) {
    if (digits.length < 9 || digits.length > 11) {
      return null;
    }
    return formatPhoneDisplay(cleaned);
  }

  return null;
}

function firstPhoneMatch(text: string, pattern: RegExp) {
  const match = text.match(pattern);
  return match?.[0] ? normalizePhoneCandidate(match[0]) : null;
}

export function extractPhoneFromText(text: string | null | undefined): string | null {
  if (!text?.trim()) {
    return null;
  }

  const normalized = text.replace(/\u00a0/g, " ");

  const telMatch = normalized.match(/tel(?:prompt)?:([+\d\s()-]+)/i);
  if (telMatch?.[1]) {
    const fromTel = normalizePhoneCandidate(telMatch[1]);
    if (fromTel) {
      return fromTel;
    }
  }

  const labelled = normalized.match(LABELLED_PHONE);
  if (labelled?.[1]) {
    const fromLabel = normalizePhoneCandidate(labelled[1]);
    if (fromLabel) {
      return fromLabel;
    }
  }

  return (
    firstPhoneMatch(normalized, KR_MOBILE) ??
    firstPhoneMatch(normalized, KR_LANDLINE) ??
    firstPhoneMatch(normalized, KR_SAFE_NUMBER)
  );
}

export function extractPhoneFromHtml(html: string): string | null {
  if (!html.trim()) {
    return null;
  }

  for (const match of html.matchAll(TEL_HREF_PATTERN)) {
    const phone = normalizePhoneCandidate(match[1]);
    if (phone) {
      return phone;
    }
  }

  const itempropPattern =
    /<[^>]*itemprop=["']telephone["'][^>]*(?:content=["']([^"']+)["']|>([^<]{6,24})<)/gi;
  for (const match of html.matchAll(itempropPattern)) {
    const phone = normalizePhoneCandidate(match[1] ?? match[2]);
    if (phone) {
      return phone;
    }
  }

  const jsonLdPattern =
    /"telephone"\s*:\s*"([^"]+)"/gi;
  for (const match of html.matchAll(jsonLdPattern)) {
    const phone = normalizePhoneCandidate(match[1]);
    if (phone) {
      return phone;
    }
  }

  return extractPhoneFromText(html);
}

export function pickEnrichedPhone(input: {
  phone?: string | null;
  title?: string | null;
  description?: string | null;
  sourceUrl?: string | null;
}): string | null {
  return (
    normalizePhoneCandidate(input.phone) ??
    extractPhoneFromText(input.description) ??
    extractPhoneFromText(input.title) ??
    extractPhoneFromText(input.sourceUrl)
  );
}
