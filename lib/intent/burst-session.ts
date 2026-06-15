import type { SaveTrajectoryEntry } from "@/lib/intent/kernel-types";

export const BURST_WINDOW_MS = 10 * 60 * 1000;
export const BURST_THRESHOLD = 5;

const ACTIVE_BURST_KEY = "rimvio:trajectory-burst-session";

type ActiveBurstState = {
  burst_session_id: string;
  started_at: number;
};

function isBrowser() {
  return typeof window !== "undefined";
}

function readActiveBurst(): ActiveBurstState | null {
  if (!isBrowser()) {
    return null;
  }

  try {
    const raw = localStorage.getItem(ACTIVE_BURST_KEY);
    return raw ? (JSON.parse(raw) as ActiveBurstState) : null;
  } catch {
    return null;
  }
}

function writeActiveBurst(state: ActiveBurstState | null) {
  if (!isBrowser()) {
    return;
  }

  if (!state) {
    localStorage.removeItem(ACTIVE_BURST_KEY);
    return;
  }

  localStorage.setItem(ACTIVE_BURST_KEY, JSON.stringify(state));
}

export function recentTrajectorySaves(
  history: SaveTrajectoryEntry[],
  now = Date.now()
) {
  return history.filter(
    (entry) => now - new Date(entry.timestamp).getTime() <= BURST_WINDOW_MS
  );
}

export function computeBurstSession(input: {
  history: SaveTrajectoryEntry[];
  activeBurst?: ActiveBurstState | null;
  now?: number;
}) {
  const now = input.now ?? Date.now();
  const recent = recentTrajectorySaves(input.history, now).sort(
    (left, right) =>
      new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime()
  );
  const burst_count = recent.length;

  if (burst_count < BURST_THRESHOLD) {
    return {
      burst_session_id: null as string | null,
      is_burst_session: false,
      burst_count,
      burst_window_ms: BURST_WINDOW_MS,
    };
  }

  const started_at = new Date(recent[0]?.timestamp ?? now).getTime();
  const active = input.activeBurst ?? readActiveBurst();
  const burst_session_id =
    active && active.started_at === started_at
      ? active.burst_session_id
      : crypto.randomUUID();

  return {
    burst_session_id,
    is_burst_session: true,
    burst_count,
    burst_window_ms: BURST_WINDOW_MS,
  };
}

export function resolveSessionIdForSave(
  history: SaveTrajectoryEntry[],
  now = Date.now()
) {
  const burst = computeBurstSession({ history, now });
  if (burst.is_burst_session && burst.burst_session_id) {
    const recent = recentTrajectorySaves(history, now).sort(
      (left, right) =>
        new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime()
    );
    writeActiveBurst({
      burst_session_id: burst.burst_session_id,
      started_at: new Date(recent[0]?.timestamp ?? now).getTime(),
    });
    return burst.burst_session_id;
  }

  writeActiveBurst(null);
  return null;
}

export function readBurstSessionFromTrajectory(
  history: SaveTrajectoryEntry[],
  now = Date.now()
) {
  return computeBurstSession({
    history,
    activeBurst: readActiveBurst(),
    now,
  });
}
