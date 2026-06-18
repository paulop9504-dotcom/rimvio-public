const MAX_TRUSTED_ACCURACY_M = 500;

export function clampGpsAccuracyMeters(
  accuracyM: number | null | undefined,
): number | null {
  if (accuracyM == null || !Number.isFinite(accuracyM) || accuracyM <= 0) {
    return null;
  }
  if (accuracyM > MAX_TRUSTED_ACCURACY_M) {
    return null;
  }
  return accuracyM;
}

export function formatGpsAccuracyLabel(accuracyM: number | null | undefined): string | null {
  const clamped = clampGpsAccuracyMeters(accuracyM);
  if (clamped == null) {
    if (accuracyM != null && accuracyM > MAX_TRUSTED_ACCURACY_M) {
      return "대략 위치";
    }
    return null;
  }
  if (clamped < 1000) {
    return `±${Math.round(clamped)}m`;
  }
  return `±${(clamped / 1000).toFixed(1)}km`;
}
