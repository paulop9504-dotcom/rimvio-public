import type { EnricherContext } from "@/lib/enrichers/types";
import { resolveRollupScoreDelta } from "@/lib/action-decision/resolve-rollup-history-weight";
import { hasInstalledApp, isCommuteHour } from "@/lib/enrichers/context";
import {
  isMapOrNaviAction,
  isPlaceRelatedUrl,
} from "@/lib/resolvers";
import type { LinkActionItem } from "@/types/database";

export type LinkActionScoreFactor = {
  key: string;
  label: string;
  points: number;
};

export function scoreLinkActionWithFactors(
  action: LinkActionItem,
  context: EnricherContext,
  sourceUrl: string,
  rankingContextKey?: string,
): { score: number; factors: LinkActionScoreFactor[] } {
  const factors: LinkActionScoreFactor[] = [];
  let score = 0;
  const href = action.href ?? sourceUrl;

  if (
    (isCommuteHour(context.hour) || context.locationCategory === "commute") &&
    isMapOrNaviAction(action)
  ) {
    score += 100;
    factors.push({ key: "commute", label: "출퇴근·이동 시간", points: 100 });
  }

  const icon =
    typeof action.payload?.icon === "string" ? action.payload.icon : null;

  if (hasInstalledApp(context, "kakaomap") && icon === "kakaomap") {
    score += 200;
    factors.push({ key: "kakaomap", label: "카카오맵 설치됨", points: 200 });
  }

  if (
    hasInstalledApp(context, "kakaomap") &&
    isPlaceRelatedUrl(href) &&
    icon === "kakaomap"
  ) {
    score += 50;
    factors.push({ key: "place", label: "장소 링크", points: 50 });
  }

  if (icon) {
    factors.push({
      key: "domain",
      label: `도메인=${icon}`,
      points: 0,
    });
  }

  if (action.payload?.icon === "external-link") {
    score -= 10;
  }

  const rollupDelta = rankingContextKey
    ? resolveRollupScoreDelta({
        contextKey: rankingContextKey,
        actionId: action.id,
        label: action.label,
      })
    : 0;

  if (rollupDelta > 0.05) {
    const rollupPoints = Math.round(rollupDelta * 40);
    score += rollupPoints;
    factors.push({
      key: "rollup",
      label: `학습 +${Math.round(rollupDelta * 10) / 10}`,
      points: rollupPoints,
    });
  }

  return { score, factors };
}

export function formatLinkActionWhyLine(input: {
  primaryLabel: string;
  factors: readonly LinkActionScoreFactor[];
}): string {
  const ranked = [...input.factors]
    .filter((factor) => factor.points > 0 || factor.key === "domain")
    .sort((left, right) => right.points - left.points);

  const domain = ranked.find((factor) => factor.key === "domain");
  const scored = ranked.filter((factor) => factor.points > 0).slice(0, 2);
  const parts = [
    ...(domain ? [domain.label] : []),
    ...scored.map((factor) => factor.label),
  ].slice(0, 2);

  if (parts.length === 0) {
    return `이 링크 → ${input.primaryLabel.trim()} (지금 가장 빠른 실행)`;
  }

  return `이 링크 → ${input.primaryLabel.trim()} (${parts.join(" · ")})`;
}
