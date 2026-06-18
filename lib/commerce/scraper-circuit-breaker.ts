export type ScraperCircuitId = "bunjang" | "naver_web";

const FAILURE_THRESHOLD = 5;
const OPEN_MS = 30 * 60 * 1000;

type CircuitState = {
  failures: number;
  openUntil: number;
};

const circuits: Record<ScraperCircuitId, CircuitState> = {
  bunjang: { failures: 0, openUntil: 0 },
  naver_web: { failures: 0, openUntil: 0 },
};

export function isScraperCircuitOpen(id: ScraperCircuitId) {
  const state = circuits[id];
  if (Date.now() < state.openUntil) {
    return true;
  }

  if (state.openUntil > 0 && Date.now() >= state.openUntil) {
    state.failures = 0;
    state.openUntil = 0;
  }

  return false;
}

export function recordScraperSuccess(id: ScraperCircuitId) {
  circuits[id].failures = 0;
  circuits[id].openUntil = 0;
}

export function recordScraperFailure(id: ScraperCircuitId) {
  const state = circuits[id];
  state.failures += 1;

  if (state.failures >= FAILURE_THRESHOLD) {
    state.openUntil = Date.now() + OPEN_MS;
  }
}

export function resetScraperCircuitsForTests() {
  for (const id of Object.keys(circuits) as ScraperCircuitId[]) {
    circuits[id] = { failures: 0, openUntil: 0 };
  }
}

export function scraperCircuitSnapshot(id: ScraperCircuitId) {
  return { ...circuits[id] };
}
