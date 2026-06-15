/** Feed / player lens — morphs UI by temporal distance. */
export type ExperienceLensId = "now" | "soon" | "then" | "where";

const DEFAULT_EVENT_MS = 2 * 3_600_000;

function parseMs(iso?: string | null): number | null {
  if (!iso?.trim()) {
    return null;
  }
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? null : ms;
}

/** Pure read — picks primary lens from volume time window. */
export function resolveExperienceLens(input: {
  startIso: string;
  endIso?: string | null;
  now?: Date;
}): ExperienceLensId {
  const now = input.now ?? new Date();
  const nowMs = now.getTime();
  const startMs = parseMs(input.startIso);
  if (startMs === null) {
    return "where";
  }

  const endMs = parseMs(input.endIso) ?? startMs + DEFAULT_EVENT_MS;

  if (endMs < nowMs - 2 * 3_600_000) {
    return "then";
  }

  if (startMs <= nowMs && nowMs <= endMs + 3_600_000) {
    return "now";
  }

  const hoursUntil = (startMs - nowMs) / 3_600_000;
  if (hoursUntil > 0 && hoursUntil <= 3) {
    return "now";
  }
  if (hoursUntil > 3 && hoursUntil <= 48) {
    return "soon";
  }
  if (hoursUntil > 48) {
    return "where";
  }

  if (hoursUntil < 0 && hoursUntil >= -2) {
    return "now";
  }

  return "then";
}

export function resolveExperienceLensForVolume(
  volume: { time: { startIso: string; endIso?: string | null } },
  now?: Date,
): ExperienceLensId {
  return resolveExperienceLens({
    startIso: volume.time.startIso,
    endIso: volume.time.endIso,
    now,
  });
}
