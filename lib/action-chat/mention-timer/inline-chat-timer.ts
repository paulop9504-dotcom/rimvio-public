/** Inline @mention timer — compact chat widget payload. */

export type InlineChatTimerStatus = "running" | "done" | "cancelled";

export type InlineChatTimerWire = {
  endsAt: string;
  startedAt: string;
  durationMs: number;
  label: string;
  status: InlineChatTimerStatus;
};

export function formatMentionTimerLabel(durationMs: number): string {
  const totalSeconds = Math.max(1, Math.round(durationMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0 && minutes > 0) {
    return `${hours}시간 ${minutes}분`;
  }
  if (hours > 0) {
    return `${hours}시간`;
  }
  if (minutes > 0 && seconds > 0) {
    return `${minutes}분 ${seconds}초`;
  }
  if (minutes > 0) {
    return `${minutes}분`;
  }
  return `${seconds}초`;
}

/** Parse `@타이머 5분`, `90초`, `10` (minutes) from mention query. */
export function parseMentionTimerDuration(query: string): number | null {
  const text = query.trim();
  if (!text) {
    return null;
  }

  const minSec = text.match(
    /(\d+)\s*(?:분|min(?:ute)?s?|m)\s*(?:(\d+)\s*(?:초|sec(?:ond)?s?|s)?)?/iu,
  );
  if (minSec) {
    const minutes = Number.parseInt(minSec[1] ?? "", 10);
    const seconds = minSec[2] ? Number.parseInt(minSec[2], 10) : 0;
    if (Number.isFinite(minutes) && Number.isFinite(seconds) && minutes >= 0 && seconds >= 0) {
      const totalMs = (minutes * 60 + seconds) * 1000;
      return totalMs > 0 ? totalMs : null;
    }
  }

  const secOnly = text.match(/(\d+)\s*(?:초|sec(?:ond)?s?|s)/iu);
  if (secOnly) {
    const seconds = Number.parseInt(secOnly[1] ?? "", 10);
    if (Number.isFinite(seconds) && seconds > 0) {
      return seconds * 1000;
    }
  }

  const bareMinutes = text.match(/^(\d+)$/);
  if (bareMinutes) {
    const minutes = Number.parseInt(bareMinutes[1] ?? "", 10);
    if (Number.isFinite(minutes) && minutes > 0 && minutes <= 180) {
      return minutes * 60 * 1000;
    }
  }

  const hourMin = text.match(
    /(\d+)\s*(?:시간|hour(?:s)?|h)(?:\s*(?:(\d+)\s*(?:분|min(?:ute)?s?|m)?))?/iu,
  );
  if (hourMin) {
    const hours = Number.parseInt(hourMin[1] ?? "", 10);
    const minutes = hourMin[2] ? Number.parseInt(hourMin[2], 10) : 0;
    if (Number.isFinite(hours) && Number.isFinite(minutes) && hours > 0 && hours <= 8) {
      const totalMs = (hours * 60 * 60 + minutes * 60) * 1000;
      return totalMs > 0 ? totalMs : null;
    }
  }

  return null;
}

export function buildInlineChatTimerWire(durationMs: number, now = Date.now()): InlineChatTimerWire {
  const startedAt = new Date(now).toISOString();
  return {
    startedAt,
    endsAt: new Date(now + durationMs).toISOString(),
    durationMs,
    label: formatMentionTimerLabel(durationMs),
    status: "running",
  };
}

export function formatInlineTimerClock(remainingMs: number): string {
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
