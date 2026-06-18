/** User-facing text for Supabase peer chat sync failures. */
export function normalizePeerSyncError(message: string | undefined): string {
  if (!message?.trim()) {
    return "채팅 동기화에 실패했어요";
  }
  const lower = message.toLowerCase();
  if (lower.includes("infinite recursion") && lower.includes("policy")) {
    return "채팅 권한 오류가 수정됐어요. 새로고침 후 다시 열어 주세요.";
  }
  return message;
}
