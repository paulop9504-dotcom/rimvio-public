import type {
  UnifiedStressConsolidation,
  UnifiedStressRun,
} from "@/lib/testing/unified-stress/types";

function section(title: string, body: string): string {
  return `\n## ${title}\n${body}\n`;
}

export function formatUnifiedStressReport(input: {
  run: UnifiedStressRun;
  consolidation?: UnifiedStressConsolidation;
}): string {
  const { run } = input;
  const lines: string[] = [];

  lines.push(`--- UNIFIED STRESS: ${run.case.id} — ${run.case.label} ---`);
  lines.push(`STATUS: ${run.pass ? "PASS" : "FAIL"} (attempts: ${run.failureAttempts})`);

  lines.push(
    section(
      "Intent Core",
      [
        `Core: ${run.expansion.intentCore}`,
        `Expanded: ${run.expansion.expandedIntents.join(" | ")}`,
      ].join("\n")
    )
  );

  lines.push(
    section(
      "Domain Mapping",
      run.expansion.domainMapping.join(", ")
    )
  );

  lines.push(
    section(
      "Time Scaling",
      run.expansion.timeScaling.join(", ")
    )
  );

  lines.push(
    section(
      "Action Type",
      run.expansion.actionType
    )
  );

  lines.push(
    section(
      "Abstraction Level",
      `${run.abstraction.level} (${run.abstraction.reason}) → ${run.abstraction.allowedOutput}${run.abstraction.mustAskQuestion ? " [must ask]" : ""}`
    )
  );

  lines.push(
    section(
      "Semantic Variations (10)",
      run.semanticVariations
        .map((v, i) => `${i + 1}. [${v.label}] ${v.text}`)
        .join("\n")
    )
  );

  lines.push(
    section(
      "Adversarial Tests (10)",
      run.adversarialTests
        .map((t, i) => `${i + 1}. [${t.kind}] ${t.input}`)
        .join("\n")
    )
  );

  lines.push(
    section(
      "Routing Result Table",
      [
        "input | expected | predicted | type | failure | pass",
        "---|---|---|---|---|---",
        ...run.routingRows.map(
          (r) =>
            `${r.input.slice(0, 30)} | ${r.expectedIntent} | ${r.predictedIntent} | ${r.routingType} | ${r.failureType} | ${r.pass ? "✓" : "✗"}`
        ),
      ].join("\n")
    )
  );

  lines.push(
    section(
      "Scheduling Conflict Analysis",
      [
        `Conflict: ${run.scheduling.conflictDetected ? "YES" : "NO"}`,
        `Kinds: ${run.scheduling.conflictKinds.join(", ") || "none"}`,
        `Affected: ${run.scheduling.affectedExisting.join("; ") || "none"}`,
        "Resolutions:",
        ...run.scheduling.resolutions.map(
          (r, i) => `  ${i + 1}. [${r.strategy}] ${r.summary}`
        ),
        `Recommended: ${run.scheduling.recommendedAction}`,
      ].join("\n")
    )
  );

  if (!run.pass) {
    lines.push(
      section(
        "Failure Analysis",
        `Failed after ${run.failureAttempts} mutation attempts. Check routing table for misroute/collapse/fallback.`
      )
    );
  }

  if (input.consolidation) {
    const w = input.consolidation.weaknessMap;
    lines.push(
      section(
        "Weakness Map (Consolidated)",
        [
          `Cases: ${input.consolidation.passed}/${input.consolidation.totalCases} PASS`,
          `Routing failure rate: ${(w.routingFailureRate * 100).toFixed(1)}%`,
          `Scheduling conflict rate: ${(w.schedulingConflictRate * 100).toFixed(1)}%`,
          "Weakest domains:",
          ...w.weakestDomains.map((d) => `  - ${d.domain}: ${d.failCount} fails`),
          "Top failure patterns:",
          ...w.topFailurePatterns.map((p) => `  - ${p.pattern}: ${p.count}`),
          "Abstraction collapse:",
          ...w.abstractionCollapseZones.map(
            (a) => `  - ${a.level}: ${a.failCount} fails`
          ),
        ].join("\n")
      )
    );
  }

  return lines.join("\n");
}

export function formatConsolidationSummary(
  consolidation: UnifiedStressConsolidation
): string {
  const w = consolidation.weaknessMap;
  return [
    "=== UNIFIED STRESS CONSOLIDATION ===",
    `TOTAL: ${consolidation.passed}/${consolidation.totalCases} PASS`,
    `Routing failure rate: ${(w.routingFailureRate * 100).toFixed(1)}%`,
    `Scheduling conflict rate: ${(w.schedulingConflictRate * 100).toFixed(1)}%`,
    `Weakest domain: ${w.weakestDomains[0]?.domain ?? "none"}`,
    `Top failure: ${w.topFailurePatterns[0]?.pattern ?? "none"}`,
    `Abstraction collapse zone: ${w.abstractionCollapseZones[0]?.level ?? "none"}`,
  ].join("\n");
}
