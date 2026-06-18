import type {
  DomainTag,
  FailureType,
  UnifiedStressConsolidation,
  UnifiedStressRun,
  WeaknessMap,
} from "@/lib/testing/unified-stress/types";

function buildWeaknessMap(runs: UnifiedStressRun[]): WeaknessMap {
  const domainFails = new Map<DomainTag, number>();
  const failurePatterns = new Map<FailureType, number>();
  const abstractionFails = new Map<string, number>();
  let schedulingConflicts = 0;
  let routingFailures = 0;
  let routingTotal = 0;

  for (const run of runs) {
    for (const domain of run.expansion.domainMapping) {
      if (!run.pass) {
        domainFails.set(domain, (domainFails.get(domain) ?? 0) + 1);
      }
    }

    if (!run.pass) {
      abstractionFails.set(
        run.abstraction.level,
        (abstractionFails.get(run.abstraction.level) ?? 0) + 1
      );
    }

    if (run.scheduling.conflictDetected) schedulingConflicts += 1;

    for (const row of run.routingRows) {
      routingTotal += 1;
      if (!row.pass) {
        routingFailures += 1;
        if (row.failureType !== "none") {
          failurePatterns.set(
            row.failureType,
            (failurePatterns.get(row.failureType) ?? 0) + 1
          );
        }
      }
    }
  }

  const weakestDomains = [...domainFails.entries()]
    .map(([domain, failCount]) => ({ domain, failCount }))
    .sort((a, b) => b.failCount - a.failCount)
    .slice(0, 5);

  const topFailurePatterns = [...failurePatterns.entries()]
    .map(([pattern, count]) => ({ pattern, count }))
    .sort((a, b) => b.count - a.count);

  const abstractionCollapseZones = [...abstractionFails.entries()]
    .map(([level, failCount]) => ({
      level: level as WeaknessMap["abstractionCollapseZones"][0]["level"],
      failCount,
    }))
    .sort((a, b) => b.failCount - a.failCount);

  return {
    weakestDomains,
    topFailurePatterns,
    abstractionCollapseZones,
    schedulingConflictRate: runs.length ? schedulingConflicts / runs.length : 0,
    routingFailureRate: routingTotal ? routingFailures / routingTotal : 0,
  };
}

export function consolidateUnifiedStress(
  runs: UnifiedStressRun[]
): UnifiedStressConsolidation {
  const passed = runs.filter((r) => r.pass).length;
  return {
    totalCases: runs.length,
    passed,
    failed: runs.length - passed,
    weaknessMap: buildWeaknessMap(runs),
  };
}
