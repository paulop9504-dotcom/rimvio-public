/** Rimvio 아이디 (카톡 ID 스타일) — 친구 검색용 */

const RESERVED = new Set([
  "admin",
  "api",
  "feed",
  "help",
  "login",
  "peers",
  "rimvio",
  "room",
  "support",
  "system",
  "welcome",
]);

const RIMVIO_ID_PATTERN = /^[a-z][a-z0-9._]{3,19}$/u;

export function normalizeRimvioId(raw: string): string | null {
  let trimmed = raw.trim().toLowerCase();
  if (trimmed.startsWith("@")) {
    trimmed = trimmed.slice(1);
  }
  if (!trimmed || !RIMVIO_ID_PATTERN.test(trimmed)) {
    return null;
  }
  if (RESERVED.has(trimmed)) {
    return null;
  }
  return trimmed;
}

export function validateRimvioId(raw: string): { ok: true; id: string } | { ok: false; reason: string } {
  const id = normalizeRimvioId(raw);
  if (!id) {
    return {
      ok: false,
      reason:
        "4~20자, 영문 소문자로 시작 · 숫자·_·. 만 가능 (예: rimvio_jihun)",
    };
  }
  return { ok: true, id };
}

/** 전화·이메일이 아니면 Rimvio ID로 해석 시도 */
export function tryParseRimvioIdContact(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed || trimmed.includes("@")) {
    return null;
  }
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length >= 9) {
    return null;
  }
  return normalizeRimvioId(trimmed);
}
