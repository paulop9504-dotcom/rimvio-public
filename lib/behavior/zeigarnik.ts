import { getShareUrgencyLine } from "@/lib/share/share-urgency";
import type { LinkRow } from "@/types/database";

export type OpenLoopLevel = 0 | 1 | 2 | 3;

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

export function resolveOpenLoopLevel(
  link: Pick<LinkRow, "created_at" | "expires_at" | "link_status">,
  now = Date.now()
): OpenLoopLevel {
  if (link.link_status === "done") {
    return 0;
  }

  const createdAt = new Date(link.created_at).getTime();
  const ageMs = Math.max(0, now - createdAt);

  let level: OpenLoopLevel = 0;

  if (ageMs >= 3 * DAY) {
    level = 3;
  } else if (ageMs >= DAY) {
    level = 2;
  } else if (ageMs >= 6 * HOUR) {
    level = 1;
  }

  if (link.expires_at) {
    const remaining = new Date(link.expires_at).getTime() - now;
    if (remaining <= HOUR) {
      level = 3;
    } else if (remaining <= 6 * HOUR && level < 2) {
      level = 2;
    }
  }

  return level;
}

export function resolveOpenLoopScore(
  link: Pick<LinkRow, "created_at" | "expires_at" | "link_status">,
  now = Date.now()
) {
  const level = resolveOpenLoopLevel(link, now);
  const ageMs = Math.max(0, now - new Date(link.created_at).getTime());

  return level * 1000 + Math.min(ageMs / HOUR, 999);
}

export function sortByOpenLoopPressure(links: LinkRow[], now = Date.now()) {
  return [...links].sort(
    (left, right) =>
      resolveOpenLoopScore(right, now) - resolveOpenLoopScore(left, now)
  );
}

export function openLoopClassName(level: OpenLoopLevel) {
  switch (level) {
    case 3:
      return "zeigarnik-3";
    case 2:
      return "zeigarnik-2";
    case 1:
      return "zeigarnik-1";
    default:
      return "zeigarnik-0";
  }
}

export function resolveOpenLoopHint(
  link: Pick<LinkRow, "created_at" | "expires_at" | "link_status">
) {
  const level = resolveOpenLoopLevel(link);

  if (level === 0) {
    return null;
  }

  const urgency = getShareUrgencyLine({ expires_at: link.expires_at ?? null });

  if (urgency) {
    return urgency;
  }

  if (level >= 3) {
    return "🔴 아직 안 끝낸 링크 — 먼저 처리할까요?";
  }

  if (level === 2) {
    return "🟠 며칠째 열어두었어요";
  }

  return "🟡 오늘 안 하면 또 미루게 돼요";
}
