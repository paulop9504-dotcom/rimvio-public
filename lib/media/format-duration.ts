export function formatDurationLabel(totalMinutes: number) {
  const safe = Math.max(1, Math.round(totalMinutes));

  if (safe < 60) {
    return `${safe}분`;
  }

  const hours = Math.floor(safe / 60);
  const minutes = safe % 60;

  if (minutes === 0) {
    return `${hours}시간`;
  }

  return `${hours}시간 ${minutes}분`;
}

export function formatDurationFromSeconds(totalSeconds: number) {
  const minutes = Math.max(1, Math.ceil(totalSeconds / 60));
  return formatDurationLabel(minutes);
}
