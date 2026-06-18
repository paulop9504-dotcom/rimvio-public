import {
  computeActionCountdown,
  computeStudyCountUpElapsed,
  formatActionTargetClock,
  type ActionCountdownSnapshot,
} from "@/lib/action-chat/action-countdown";
import type {
  ActiveActionEntry,
  ActiveActionKind,
} from "@/lib/action-chat/active-actions-registry";

export type ActionCardPresentation = {
  title: string;
  timeLine: string;
  statusLabel: string;
  statusTone: "ready" | "waiting" | "confirm" | "reminder";
  clockLabel: string | null;
  relativeLabel: string | null;
};

function kindStatus(kind: ActiveActionKind): {
  label: string;
  tone: ActionCardPresentation["statusTone"];
} {
  switch (kind) {
    case "scheduled_nav":
      return { label: "예약됨", tone: "waiting" };
    case "link_reminder":
      return { label: "알림", tone: "reminder" };
    case "pending_confirm":
      return { label: "확인 필요", tone: "confirm" };
    case "study_focus":
      return { label: "집중 중", tone: "ready" };
    default:
      return { label: "실행 가능", tone: "ready" };
  }
}

function formatRelativeLabel(
  entry: ActiveActionEntry,
  countdown: ActionCountdownSnapshot | null,
): string | null {
  if (entry.kind === "study_focus" && entry.fireAt) {
    return computeStudyCountUpElapsed(entry.fireAt)?.headline ?? null;
  }
  if (!countdown) {
    return null;
  }
  if (countdown.isPast) {
    return "지금";
  }
  const hours = Math.floor(countdown.remainingMinutes / 60);
  if (hours >= 1) {
    return `D-${hours}시간`;
  }
  return countdown.headline;
}

function deriveTitle(entry: ActiveActionEntry): string {
  const place = entry.placeName?.trim();
  if (place) {
    if (entry.kind === "scheduled_nav") {
      return `${place} 방문`;
    }
    if (entry.kind === "pending_confirm") {
      return `${place} 확인`;
    }
    return place;
  }

  const raw = entry.title.trim();
  if (entry.kind === "link_reminder") {
    return raw;
  }

  return raw.replace(/\s*(길찾기|확인)\s*$/u, "").trim() || raw;
}

function deriveTimeLine(
  entry: ActiveActionEntry,
  countdown: ActionCountdownSnapshot | null
): string {
  const clock = entry.fireAt ? formatActionTargetClock(entry.fireAt) : null;
  const relative = formatRelativeLabel(entry, countdown);

  if (entry.kind === "study_focus" && clock && relative) {
    return `${clock} 시작 · ${relative}`;
  }

  if (clock && relative) {
    return `${clock} 예약 · ${relative}`;
  }
  if (clock) {
    return `${clock} 예약`;
  }
  if (relative) {
    return relative;
  }

  return entry.subtitle;
}

/** Card-facing copy — title / time / status hierarchy (not raw chat). */
export function deriveActionCardPresentation(
  entry: ActiveActionEntry
): ActionCardPresentation {
  const countdown = entry.fireAt ? computeActionCountdown(entry.fireAt) : null;
  const status = kindStatus(entry.kind);

  return {
    title: deriveTitle(entry),
    timeLine: deriveTimeLine(entry, countdown),
    statusLabel: status.label,
    statusTone: status.tone,
    clockLabel: entry.fireAt ? formatActionTargetClock(entry.fireAt) : null,
    relativeLabel: formatRelativeLabel(entry, countdown),
  };
}
