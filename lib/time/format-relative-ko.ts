const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/** Kakao-style relative time for feed slots. */
export function formatRelativeKo(iso: string, now = Date.now()): string {
  const at = new Date(iso).getTime();
  if (!Number.isFinite(at)) {
    return "";
  }
  const diff = Math.max(0, now - at);
  if (diff < MINUTE_MS) {
    return "방금 전";
  }
  if (diff < HOUR_MS) {
    return `${Math.floor(diff / MINUTE_MS)}분 전`;
  }
  if (diff < DAY_MS) {
    return `${Math.floor(diff / HOUR_MS)}시간 전`;
  }
  if (diff < DAY_MS * 7) {
    return `${Math.floor(diff / DAY_MS)}일 전`;
  }
  const d = new Date(at);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}
