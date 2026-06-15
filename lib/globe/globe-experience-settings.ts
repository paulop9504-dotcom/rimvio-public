import { CONTEXT_MATCH_HIGH_SCORE } from "@/lib/ingest/context-match-media-gate";

const STORAGE_KEY = "rimvio.globe-experience.v1";
export const GLOBE_EXPERIENCE_SETTINGS_UPDATED = "rimvio-globe-experience-settings-updated";

export type GlobeExperienceSettings = {
  /** GPS dwell clusters → feed events while app is open. */
  gpsDwellIngest: boolean;
  /** High-confidence media attach skips verify card. */
  silentAutoAttach: boolean;
  /** Trip leg arcs on the 3D globe. */
  showTripArcs: boolean;
  /** Soft warmth wash for personal trace density (overview/region only). */
  showContextWarmth: boolean;
};

const DEFAULTS: GlobeExperienceSettings = {
  gpsDwellIngest: true,
  silentAutoAttach: true,
  showTripArcs: true,
  showContextWarmth: true,
};

let memory: GlobeExperienceSettings | null = null;

function emitUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(GLOBE_EXPERIENCE_SETTINGS_UPDATED));
  }
}

function normalize(raw: unknown): GlobeExperienceSettings {
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULTS };
  }
  const row = raw as Partial<GlobeExperienceSettings>;
  return {
    gpsDwellIngest: row.gpsDwellIngest !== false,
    silentAutoAttach: row.silentAutoAttach !== false,
    showTripArcs: row.showTripArcs !== false,
    showContextWarmth: row.showContextWarmth !== false,
  };
}

export function readGlobeExperienceSettings(): GlobeExperienceSettings {
  if (memory) {
    return memory;
  }
  if (typeof window === "undefined") {
    return { ...DEFAULTS };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { ...DEFAULTS };
    }
    memory = normalize(JSON.parse(raw));
    return memory;
  } catch {
    return { ...DEFAULTS };
  }
}

export function writeGlobeExperienceSettings(
  patch: Partial<GlobeExperienceSettings>,
): GlobeExperienceSettings {
  const next = { ...readGlobeExperienceSettings(), ...patch };
  memory = next;
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
    emitUpdated();
  }
  return next;
}

export function isGpsDwellIngestEnabled(): boolean {
  return readGlobeExperienceSettings().gpsDwellIngest;
}

export function isSilentAutoAttachEnabled(): boolean {
  return readGlobeExperienceSettings().silentAutoAttach;
}

export function isShowTripArcsEnabled(): boolean {
  return readGlobeExperienceSettings().showTripArcs;
}

export function isShowContextWarmthEnabled(): boolean {
  return readGlobeExperienceSettings().showContextWarmth;
}

/** Whether auto-attached capture should surface the verify card. */
export function shouldRequireFeedCaptureVerify(input: {
  userConfirmedTarget?: boolean;
  score?: number | null;
}): boolean {
  if (input.userConfirmedTarget) {
    return false;
  }
  if (!isSilentAutoAttachEnabled()) {
    return true;
  }
  const score = input.score ?? 0;
  return score < CONTEXT_MATCH_HIGH_SCORE;
}
