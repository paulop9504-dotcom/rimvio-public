/** OAuth / 로그인 직후 기본 랜딩 — 프로필 완료 시 친구(ROOM) 우선 */

export function resolvePostLoginPathAfterAuth(input: {
  requestedNext: string;
  needsProfileSetup: boolean;
}): string {
  if (input.needsProfileSetup) {
    return "/onboarding";
  }

  const next = input.requestedNext.trim();
  if (
    next === "/feed" ||
    next === "/" ||
    next === "/onboarding" ||
    next === ""
  ) {
    return "/peers";
  }

  return next.startsWith("/") ? next : "/peers";
}
