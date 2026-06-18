import type {
  ExperiencePeak,
  ExperienceVolume,
} from "@/lib/experience-graph/experience-volume-types";

export type ExperienceQueryIntent =
  | "happiest_space"
  | "romantic_moment"
  | "longest_dwell";

const QUERY_PATTERNS: Record<ExperienceQueryIntent, RegExp> = {
  happiest_space: /가장\s*행복|행복했던\s*공간/u,
  romantic_moment: /가장\s*낭만|낭만.*?순간/u,
  longest_dwell: /가장\s*길|오래\s*머문/u,
};

export function parseExperienceQueryIntent(query: string): ExperienceQueryIntent | null {
  const trimmed = query.trim();
  if (!trimmed) {
    return null;
  }
  for (const [intent, pattern] of Object.entries(QUERY_PATTERNS) as Array<
    [ExperienceQueryIntent, RegExp]
  >) {
    if (pattern.test(trimmed)) {
      return intent;
    }
  }
  return null;
}

function pickPeak(volume: ExperienceVolume, intent: ExperienceQueryIntent): ExperiencePeak | null {
  switch (intent) {
    case "happiest_space":
      return volume.peaks.find((peak) => peak.kind === "space") ?? volume.peaks[0] ?? null;
    case "romantic_moment":
      return volume.peaks.find((peak) => peak.kind === "moment") ?? volume.peaks[0] ?? null;
    case "longest_dwell":
      return volume.peaks.find((peak) => peak.kind === "dwell") ?? volume.peaks[0] ?? null;
    default:
      return volume.peaks[0] ?? null;
  }
}

/** Layer 6 read — natural-language peak inside a volume. */
export function resolveExperienceQuery(input: {
  volume: ExperienceVolume;
  query: string;
}): { intent: ExperienceQueryIntent | null; peak: ExperiencePeak | null; answer: string | null } {
  const intent = parseExperienceQueryIntent(input.query);
  if (!intent) {
    return { intent: null, peak: null, answer: null };
  }

  const peak = pickPeak(input.volume, intent);
  if (!peak) {
    return { intent, peak: null, answer: null };
  }

  return {
    intent,
    peak,
    answer: peak.queryHint,
  };
}
