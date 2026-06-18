/** Lowercase email for lookup (Google 로그인 이메일 포함). */
export function normalizeEmail(raw: string): string | null {
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed || !trimmed.includes("@")) {
    return null;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(trimmed)) {
    return null;
  }
  return trimmed;
}

export function looksLikeEmail(raw: string): boolean {
  return raw.trim().includes("@");
}
