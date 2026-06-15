const FRIEND_ERROR_KO: Record<string, string> = {
  empty: "친구 Rimvio ID · 전화번호 · 이메일을 입력해 주세요.",
  invalid: "Rimvio ID · 010 번호 · 이메일 중 하나를 올바르게 입력해 주세요.",
  self: "자기 자신은 추가할 수 없어요.",
  not_registered:
    "아직 Rimvio에 없는 사람이에요. 친구가 Google로 가입만 하면 이메일로 찾을 수 있어요.",
  need_contact: "Google 로그인 후 다시 시도해 주세요.",
  Authentication: "친추는 로그인 후에 쓸 수 있어요.",
  "Authentication required.": "친추는 로그인 후에 쓸 수 있어요.",
  "Failed to add friend.": "친구 추가에 실패했어요. 잠시 후 다시 시도해 주세요.",
  "친구 추가에 실패했어요. 잠시 후 다시 시도해 주세요.":
    "친구 추가에 실패했어요. 잠시 후 다시 시도해 주세요.",
  "Caller must join the DM thread first.": "대화방을 먼저 만들지 못했어요. 다시 시도해 주세요.",
  "Both users must be members of the DM thread.": "대화방 연결을 마치지 못했어요. 다시 시도해 주세요.",
  "Failed to send message.": "메시지 전송에 실패했어요. 잠시 후 다시 시도해 주세요.",
  "Empty message.": "메시지를 입력해 주세요.",
  "body required.": "메시지를 입력해 주세요.",
};

/** Postgres NOT NULL / constraint messages → short Korean for UI. */
export function friendContactErrorMessage(
  codeOrMessage: string | undefined,
): string {
  if (!codeOrMessage) {
    return "친구를 찾지 못했어요. 다시 시도해 주세요.";
  }
  const lower = codeOrMessage.toLowerCase();
  if (lower.includes("interaction_score") && lower.includes("null")) {
    return "친구 목록 데이터를 고쳤어요. 친구 추가를 한 번 더 눌러 주세요.";
  }
  if (lower.includes("row-level security") || lower.includes("rls")) {
    return "대화방 권한 문제예요. @친추로 친구를 다시 연결한 뒤 보내 주세요.";
  }
  if (
    lower.includes("image_url") &&
    (lower.includes("schema cache") || lower.includes("could not find"))
  ) {
    return "메시지 DB 설정이 맞지 않아요. 잠시 후 다시 시도해 주세요.";
  }
  if (codeOrMessage.startsWith("peer_image_column_missing:")) {
    return codeOrMessage.slice("peer_image_column_missing:".length);
  }
  if (codeOrMessage.startsWith("not_registered:")) {
    return codeOrMessage.slice("not_registered:".length);
  }
  return FRIEND_ERROR_KO[codeOrMessage] ?? codeOrMessage;
}
