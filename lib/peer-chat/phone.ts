/** Normalize Korean mobile numbers to E.164 (+82…). */
export function normalizePhoneE164(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (!digits) {
    return null;
  }

  if (digits.startsWith("82") && digits.length >= 10) {
    return `+${digits}`;
  }

  if (digits.startsWith("010") && digits.length === 11) {
    return `+82${digits.slice(1)}`;
  }

  if (digits.startsWith("10") && digits.length === 10) {
    return `+82${digits}`;
  }

  if (digits.length >= 10 && digits.length <= 15) {
    return `+${digits}`;
  }

  return null;
}

export function formatPhoneDisplay(e164: string): string {
  const digits = e164.replace(/\D/g, "");
  if (digits.startsWith("82") && digits.length >= 10) {
    const local = `0${digits.slice(2)}`;
    if (local.length === 11) {
      return `${local.slice(0, 3)}-${local.slice(3, 7)}-${local.slice(7)}`;
    }
  }
  return e164;
}
