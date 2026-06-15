const GROUP_TALK_ALIASES = "(?:단톡|그룹|group|groupchat|그룹톡)";

export type ActiveGroupTalkComposer = {
  query: string;
};

/** 입력 끝이 `@단톡` / `@단톡 주말` 형태일 때 활성. */
export function parseActiveGroupTalkComposer(
  text: string,
): ActiveGroupTalkComposer | null {
  const match = text.match(
    new RegExp(`(?:^|\\s)@${GROUP_TALK_ALIASES}\\s*(\\S*)$`, "iu"),
  );
  if (!match) {
    return null;
  }
  return { query: match[1] ?? "" };
}
