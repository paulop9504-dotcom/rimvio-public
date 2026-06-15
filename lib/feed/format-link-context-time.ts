export function formatLinkContextTime(iso: string, now = Date.now()): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) {
    return "방금";
  }

  const diffMs = Math.max(0, now - then);
  const minutes = Math.floor(diffMs / 60_000);

  if (minutes < 1) {
    return "방금";
  }
  if (minutes < 60) {
    return `${minutes}분 전`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}시간 전`;
  }

  const days = Math.floor(hours / 24);
  if (days === 1) {
    return "어제";
  }
  if (days < 7) {
    return `${days}일 전`;
  }

  return new Date(iso).toLocaleDateString("ko-KR", {
    month: "short",
    day: "numeric",
  });
}
