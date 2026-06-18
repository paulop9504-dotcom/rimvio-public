/**
 * Project Marble slim protocol — intersection "must cut" applied.
 * @ tokens exposed to users are minimal; removed tokens fall through to NL orchestrator.
 */

/** Local express-lane handlers (no orchestrator). */
export const SLIM_DEDICATED_LOCAL_FEATURE_IDS = [
  "reminder",
  "navigate",
  "schedule",
  "transfer",
  "parking",
  "linksheet",
  "calendar",
  "end_peer_talk",
] as const;

/** Generic inline @ chip (money / OTA / link / social). */
export const SLIM_INLINE_ACTION_FEATURE_IDS = [
  "link",
  "dutch",
  "delivery",
  "pickup",
  "receipt",
  "gas",
  "station",
  "taxi",
  "meal",
  "manual",
  "friend_add",
  "peer_talk",
  "group_talk",
  "todo",
] as const;

export const SLIM_MENTION_FEATURE_IDS = [
  ...SLIM_DEDICATED_LOCAL_FEATURE_IDS,
  ...SLIM_INLINE_ACTION_FEATURE_IDS,
] as const;

/** Command router tokens (pre-parser NL collapse). */
export const SLIM_COMMAND_TOKENS = [
  "길찾기",
  "네비",
  "역",
  "주유",
  "택시",
  "알림",
  "일정정리",
  "식사",
  "할일",
  "캘린더",
  "송금",
  "더치",
  "영수증",
  "배달",
  "픽업",
  "링크",
  "링크시트",
  "주차",
  "톡",
  "대화끝",
  "친추",
  "설명서",
  "검색",
] as const;

/** Removed — route to orchestrator via @검색 or NL only. */
export const DEPRECATED_COMMAND_TOKENS = [
  "타이머",
  "점심",
  "출근",
  "퇴근",
  "가격",
  "쿠폰",
  "팁",
  "환율",
  "날씨",
  "다시",
  "메모",
  "물",
  "방해금지",
  "번역",
  "복붙",
  "우산",
  "운동",
  "전화",
  "지금",
  "집중",
  "캡처",
  "택배",
] as const;

const SLIM_FEATURE_SET = new Set<string>(SLIM_MENTION_FEATURE_IDS);
const SLIM_TOKEN_SET = new Set<string>(
  SLIM_COMMAND_TOKENS.map((t) => t.toLowerCase()),
);

export function isSlimMentionFeatureId(featureId: string): boolean {
  return SLIM_FEATURE_SET.has(featureId);
}

export function isSlimCommandToken(token: string): boolean {
  return SLIM_TOKEN_SET.has(token.trim().toLowerCase());
}

export function isDeprecatedCommandToken(token: string): boolean {
  return (DEPRECATED_COMMAND_TOKENS as readonly string[]).includes(
    token.trim().toLowerCase(),
  );
}
