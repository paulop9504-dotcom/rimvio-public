import { validateRimvioId } from "@/lib/peer-chat/rimvio-id";

function sanitizeLocalPart(raw: string): string {
  let s = raw
    .toLowerCase()
    .replace(/[^a-z0-9._]/g, "")
    .replace(/\.{2,}/g, ".")
    .replace(/^\.+|\.+$/g, "");
  if (!s) {
    return "";
  }
  if (!/^[a-z]/u.test(s)) {
    s = `r${s}`;
  }
  if (s.length < 4) {
    s = `${s}rim`.slice(0, 20);
  }
  return s.slice(0, 20);
}

/** Google 이메일·이름에서 친구 검색용 Rimvio ID 후보 생성 */
export function suggestRimvioIdFromEmail(email: string | null | undefined): string | null {
  const trimmed = email?.trim().toLowerCase() ?? "";
  const local = trimmed.split("@")[0] ?? "";
  if (!local) {
    return null;
  }
  const candidate = sanitizeLocalPart(local);
  const parsed = validateRimvioId(candidate);
  return parsed.ok ? parsed.id : null;
}

export function suggestRimvioIdFromDisplayName(
  displayName: string | null | undefined,
): string | null {
  const trimmed = displayName?.trim() ?? "";
  if (!trimmed) {
    return null;
  }
  const romanized = trimmed
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, "_");
  const candidate = sanitizeLocalPart(romanized);
  const parsed = validateRimvioId(candidate);
  return parsed.ok ? parsed.id : null;
}

export function pickSuggestedRimvioId(input: {
  email?: string | null;
  displayName?: string | null;
}): string | null {
  return (
    suggestRimvioIdFromEmail(input.email) ??
    suggestRimvioIdFromDisplayName(input.displayName)
  );
}
