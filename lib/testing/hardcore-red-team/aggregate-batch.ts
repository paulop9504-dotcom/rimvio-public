import type {
  HardcoreBatchSummary,
  HardcoreExecutionEntry,
  HardcoreFailureMode,
} from "@/lib/testing/hardcore-red-team/types";
import { collectCostWarnings } from "@/lib/testing/hardcore-red-team/cost-tracker";

function pct(n: number, d: number): number {
  return d === 0 ? 0 : Math.round((n / d) * 1000) / 10;
}

export function aggregateHardcoreBatch(
  entries: HardcoreExecutionEntry[]
): HardcoreBatchSummary {
  const total = entries.length;
  const failures = entries.filter((e) => e.failure.isFailure);
  const failureRate = pct(failures.length, total);

  const modeCounts = new Map<HardcoreFailureMode, number>();
  for (const e of failures) {
    modeCounts.set(e.failure.failureMode, (modeCounts.get(e.failure.failureMode) ?? 0) + 1);
  }
  const topFailureModes = [...modeCounts.entries()]
    .map(([mode, count]) => ({ mode, count }))
    .sort((a, b) => b.count - a.count);

  const weakest = [...entries]
    .filter((e) => e.failure.isFailure)
    .sort((a, b) => a.failure.confidenceScore - b.failure.confidenceScore)
    .slice(0, 5)
    .map((e) => ({
      testId: e.testId,
      input: e.input.slice(0, 50),
      weakPoint: e.failure.systemWeakPoint,
    }));

  const confusion = new Map<string, number>();
  for (const e of entries) {
    const key = `${e.expectedRouting}→${e.routingDecision}`;
    confusion.set(key, (confusion.get(key) ?? 0) + 1);
  }
  const routingConfusionMap = [...confusion.entries()]
    .map(([key, count]) => {
      const [expected, predicted] = key.split("→") as [
        HardcoreExecutionEntry["expectedRouting"],
        HardcoreExecutionEntry["routingDecision"],
      ];
      return { expected, predicted, count };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const abstractionFails = new Map<string, number>();
  for (const e of failures) {
    abstractionFails.set(
      e.abstractionLevel,
      (abstractionFails.get(e.abstractionLevel) ?? 0) + 1
    );
  }
  const abstractionCollapseZones = [...abstractionFails.entries()]
    .map(([level, failCount]) => ({
      level: level as HardcoreExecutionEntry["abstractionLevel"],
      failCount,
    }))
    .sort((a, b) => b.failCount - a.failCount);

  const schedulingBlindSpots = entries
    .filter(
      (e) =>
        e.failure.failureMode === "scheduling_override" ||
        (e.testSet === "SET4_TIME_SCHEDULING" && !e.schedulingConflict) ||
        (e.testSet === "SET7_SYSTEM_SHOCK" && !e.schedulingConflict)
    )
    .map((e) => `${e.testId}: ${e.input.slice(0, 40)}`);

  const overStructuringTriggers = entries
    .filter((e) => e.failure.failureMode === "over-structuring")
    .map((e) => e.input.slice(0, 60));

  const ambiguityCases = entries.filter((e) =>
    /모르|그냥|애매|비슷|아까|대충|적당|느낌/u.test(e.input)
  );
  const ambiguityFails = ambiguityCases.filter((e) => e.failure.isFailure);

  const multiIntentCases = entries.filter((e) =>
    e.expandedIntents.length >= 3 || /\+|그리고|인데.*인데/u.test(e.input)
  );
  const multiIntentFails = multiIntentCases.filter((e) => e.failure.isFailure);

  const scheduleOverrideCases = entries.filter((e) =>
    /무시|갈아|재설계|루틴/u.test(e.input)
  );
  const scheduleOverrideFails = scheduleOverrideCases.filter((e) => e.failure.isFailure);

  const abstractionErrors = entries.filter((e) => e.abstractionError);
  const overStructCases = entries.filter(
    (e) => e.failure.failureMode === "over-structuring"
  );

  const set1 = entries.filter((e) => e.testSet === "SET1_PURE_BREAKDOWN");
  const set1Fail = set1.filter((e) => e.failure.isFailure);
  const noiseCases = entries.filter((e) =>
    e.testSet === "SET5_EMOTIONAL_NOISE" || e.testSet === "SET_MIXED_LAYER"
  );
  const noiseFail = noiseCases.filter((e) => e.failure.isFailure);
  const conflictCases = entries.filter((e) => e.testSet === "SET3_MULTI_CONFLICT");
  const conflictSurvive = conflictCases.filter((e) => !e.failure.isFailure);
  const driftCases = entries.filter((e) => e.testSet === "SET2_CONTEXT_COLLAPSE");
  const driftOk = driftCases.filter((e) => !e.failure.isFailure);

  const l0cases = entries.filter((e) => e.abstractionLevel === "L0");
  const l0confused = l0cases.filter((e) => e.failure.isFailure);
  const l1cases = entries.filter((e) => e.abstractionLevel === "L1");
  const l1frag = l1cases.filter((e) => e.failure.isFailure);
  const l2cases = entries.filter((e) => e.abstractionLevel === "L2");
  const l2mis = l2cases.filter((e) => e.abstractionError);
  const l3cases = entries.filter((e) => e.abstractionLevel === "L3");
  const l3over = l3cases.filter((e) => e.failure.failureMode === "over-structuring");
  const l4cases = entries.filter((e) => e.abstractionLevel === "L4");
  const l4over = l4cases.filter((e) => e.failure.failureMode === "over-structuring");

  const expectConflict = entries.filter(
    (e) =>
      e.testSet === "SET4_TIME_SCHEDULING" ||
      e.testSet === "SET7_SYSTEM_SHOCK" ||
      e.testSet === "SET3_MULTI_CONFLICT"
  );
  const detected = expectConflict.filter((e) => e.schedulingConflict);
  const missed = expectConflict.filter((e) => !e.schedulingConflict);

  const totalTokens = entries.reduce((s, e) => s + e.cost.totalTokens, 0);
  const totalCost = entries.reduce((s, e) => s + e.cost.estimatedCostUsd, 0);
  const avgLatency =
    entries.reduce((s, e) => s + e.latency.responseTimeMs, 0) / Math.max(1, total);

  const slowest = [...entries].sort(
    (a, b) => b.latency.routingTimeMs - a.latency.routingTimeMs
  )[0];
  const costliest = [...entries].sort((a, b) => b.cost.totalTokens - a.cost.totalTokens)[0];
  const mostVulnerable = weakest[0];

  return {
    totalTests: total,
    totalTokensUsed: totalTokens,
    totalCostUsd: Math.round(totalCost * 1_000_000) / 1_000_000,
    avgLatencyMs: Math.round(avgLatency),
    failureRate,
    topFailureModes,
    top5WeakestScenarios: weakest,
    routingConfusionMap,
    abstractionCollapseZones,
    schedulingBlindSpots,
    overStructuringTriggers,
    adversarialResistance: {
      boundaryBreakFailureRate: pct(set1Fail.length, set1.length),
      noiseInjectionFailureRate: pct(noiseFail.length, noiseCases.length),
      intentConflictSurvivalRate: pct(conflictSurvive.length, conflictCases.length),
      contextDriftHandlingScore: pct(driftOk.length, driftCases.length),
    },
    abstractionStability: {
      l0ConfusionRate: pct(l0confused.length, l0cases.length),
      l1FragmentationRate: pct(l1frag.length, l1cases.length),
      l2MisclassificationRate: pct(l2mis.length, l2cases.length),
      l3OverStructuringRate: pct(l3over.length, l3cases.length),
      l4OverEngineeringRate: pct(l4over.length, l4cases.length),
    },
    schedulingMetrics: {
      conflictDetectedRate: pct(detected.length, expectConflict.length),
      falsePositiveRate: 0,
      falseNegativeRate: pct(missed.length, expectConflict.length),
      blindSpotCount: schedulingBlindSpots.length,
    },
    criticalMetrics: {
      ambiguityCollapseRate: pct(ambiguityFails.length, ambiguityCases.length),
      multiIntentOverloadRate: pct(multiIntentFails.length, multiIntentCases.length),
      schedulingOverrideFailureRate: pct(
        scheduleOverrideFails.length,
        scheduleOverrideCases.length
      ),
      abstractionMisclassificationRate: pct(abstractionErrors.length, total),
      overStructuringFailureRate: pct(overStructCases.length, total),
    },
    costWarnings: collectCostWarnings(entries.map((e) => e.cost)),
    systemInsight: {
      mostVulnerableInputType: mostVulnerable?.weakPoint ?? "none",
      highestCostCase: costliest ? `${costliest.testId} (${costliest.cost.totalTokens} tok)` : "none",
      slowestRoutingPath: slowest
        ? `${slowest.testId} (${Math.round(slowest.latency.routingTimeMs)}ms)`
        : "none",
    },
  };
}
