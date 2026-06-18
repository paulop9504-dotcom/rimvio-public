/** 피드 입력창 — @톡 뒤 이름을 치는 동안 실시간 필터 */

const PEER_TALK_ALIASES = "(?:톡|talk|dm|메신저|쪽지|대화)";

export type ActivePeerTalkComposer = {
  /** 이름 필터 (빈 문자열 = @톡 직후 · 전체 후보) */
  query: string;
};

/**
 * 입력 끝이 `@톡` / `@톡 박` / `@톡박성용` 형태일 때만 활성.
 * null이면 버블 숨김.
 */
export function parseActivePeerTalkComposer(
  text: string,
): ActivePeerTalkComposer | null {
  const match = text.match(
    new RegExp(`(?:^|\\s)@${PEER_TALK_ALIASES}\\s*(\\S*)$`, "iu"),
  );
  if (!match) {
    return null;
  }
  return { query: match[1] ?? "" };
}
