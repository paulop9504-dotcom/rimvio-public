import type {
  BatchPendingItem,
  ConfirmationExtractedData,
} from "@/lib/action-chat/confirmation-types";

export type ActionCountdownSnapshot = {
  targetIso: string;
  remainingMs: number;
  remainingMinutes: number;
  remainingSeconds: number;
  clock: string;
  headline: string;
  isPast: boolean;
  isImminent: boolean;
};

export function parseActionTargetDatetime(iso: string | null | undefined): Date | null {
  if (!iso?.trim()) {
    return null;
  }

  const parsed = new Date(iso.includes("T") ? iso : `${iso}T09:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function resolveActionDatetimeIso(input: {
  extracted?: ConfirmationExtractedData | null;
  batchPending?: BatchPendingItem[];
}): string | null {
  if (input.extracted?.datetime) {
    return input.extracted.datetime;
  }

  const pendingSchedule = input.batchPending?.find(
    (item) => item.type === "DATETIME" || item.type === "SCHEDULE"
  );

  return pendingSchedule?.extracted_data?.datetime ?? null;
}

export function computeActionCountdown(
  targetIso: string,
  nowMs = Date.now()
): ActionCountdownSnapshot | null {
  const target = parseActionTargetDatetime(targetIso);
  if (!target) {
    return null;
  }

  const remainingMs = target.getTime() - nowMs;
  const isPast = remainingMs <= 0;
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const remainingMinutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;
  const clock =
    remainingMinutes >= 60
      ? `${Math.floor(remainingMinutes / 60)}:${pad(remainingMinutes % 60)}:${pad(remainingSeconds)}`
      : `${remainingMinutes}:${pad(remainingSeconds)}`;

  const headline = isPast
    ? "일정 시간 도래"
    : remainingMinutes <= 0
      ? `${remainingSeconds}초 후`
      : remainingMinutes <= 2
        ? `${remainingMinutes}분 ${remainingSeconds}초 후`
        : `${remainingMinutes}분 후`;

  return {
    targetIso,
    remainingMs,
    remainingMinutes,
    remainingSeconds,
    clock,
    headline,
    isPast,
    isImminent: !isPast && remainingMs <= 2 * 60 * 1000,
  };
}

export function computeStudyCountUpElapsed(
  startedAtIso: string,
  nowMs = Date.now(),
): { clock: string; headline: string; minutes: number } | null {
  const started = parseActionTargetDatetime(startedAtIso);
  if (!started) {
    return null;
  }

  const elapsedMs = Math.max(0, nowMs - started.getTime());
  const totalSeconds = Math.floor(elapsedMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const clock =
    minutes >= 60
      ? `${Math.floor(minutes / 60)}:${pad(minutes % 60)}:${pad(seconds)}`
      : `${minutes}:${pad(seconds)}`;

  const headline =
    minutes <= 0
      ? `${seconds}초 경과`
      : minutes < 60
        ? `${minutes}분 ${seconds}초 경과`
        : `${Math.floor(minutes / 60)}시간 ${minutes % 60}분 경과`;

  return { clock, headline, minutes };
}

export function formatActionTargetClock(targetIso: string): string {
  const target = parseActionTargetDatetime(targetIso);
  if (!target) {
    return targetIso;
  }

  return target.toLocaleTimeString("ko-KR", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}
