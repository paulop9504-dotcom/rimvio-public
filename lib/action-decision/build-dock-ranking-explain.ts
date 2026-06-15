import type { ScoredActionDecision } from "@/lib/action-decision/types";

export type DockRankingFactor = {
  key: string;
  label: string;
  weight: number;
};

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/** Deterministic MAIN ranking factors for user-facing “왜 이 액션?” copy. */
export function buildDockRankingFactors(
  scored: ScoredActionDecision,
): DockRankingFactor[] {
  const factors: DockRankingFactor[] = [];

  const rollupDelta = scored.rollup_score_delta ?? 0;

  if (rollupDelta > 0.05) {
    factors.push({
      key: "rollup",
      label: `학습 가중 +${round1(rollupDelta)}`,
      weight: rollupDelta + 1.2,
    });
  }

  if (scored.time_criticality >= 0.65) {
    factors.push({
      key: "time",
      label: "일정이 가까움",
      weight: scored.time_criticality,
    });
  }

  if (scored.external_execution_weight >= 1) {
    factors.push({
      key: "external",
      label: "외부 앱으로 바로 실행",
      weight: 0.85,
    });
  }

  if (scored.state_change_weight >= 1) {
    factors.push({
      key: "state",
      label: "상태를 바꾸는 액션",
      weight: 0.75,
    });
  }

  if (scored.user_history_weight >= 0.62 && rollupDelta <= 0.05) {
    factors.push({
      key: "history",
      label: "자주 쓰는 패턴",
      weight: scored.user_history_weight,
    });
  }

  if (scored.plugin?.trim()) {
    factors.push({
      key: "plugin",
      label: `${scored.plugin} 연동`,
      weight: 0.55,
    });
  }

  return factors.sort((left, right) => right.weight - left.weight);
}

/** One-line Korean hint under Action Dock MAIN (≤ ~80 chars). */
export function formatDockRankingWhyLine(input: {
  primaryLabel: string;
  factors: readonly DockRankingFactor[];
}): string {
  const top = [...input.factors]
    .sort((left, right) => right.weight - left.weight)
    .slice(0, 2)
    .map((factor) => factor.label);

  if (top.length === 0) {
    return `이 링크 → ${input.primaryLabel.trim()} (지금 가장 빠른 실행)`;
  }

  return `이 링크 → ${input.primaryLabel.trim()} (${top.join(" · ")})`;
}

export function buildDockRankingWhyFromScored(
  scored: ScoredActionDecision,
): string {
  return formatDockRankingWhyLine({
    primaryLabel: scored.label,
    factors: buildDockRankingFactors(scored),
  });
}
