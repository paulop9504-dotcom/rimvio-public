/** User-facing bridge fetch errors — null = silent retry (keep stale UI). */
export function toBridgeFetchError(caught: unknown): string | null {
  const message =
    caught instanceof Error ? caught.message.trim().toLowerCase() : "";

  if (!message) {
    return null;
  }
  if (message.includes("authentication required") || message.includes("401")) {
    return "로그인이 필요해요";
  }
  if (message.includes("forbidden") || message.includes("403")) {
    return "이 경험에 접근할 수 없어요";
  }
  if (
    message.includes("failed to fetch") ||
    message.includes("network") ||
    message.includes("load failed") ||
    message.includes("timeout")
  ) {
    return null;
  }
  if (message.includes("supabase is not configured")) {
    return null;
  }
  return "잠시 후 다시 시도해 주세요";
}
