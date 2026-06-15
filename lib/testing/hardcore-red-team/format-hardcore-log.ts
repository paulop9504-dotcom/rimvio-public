import type {
  HardcoreBatchSummary,
  HardcoreExecutionEntry,
} from "@/lib/testing/hardcore-red-team/types";

/** Raw red-team log — no friendly formatting. */
export function formatHardcoreTestEntry(entry: HardcoreExecutionEntry): string {
  const lines = [
    "📄 TEST ENTRY",
    `test_id: ${entry.testId}`,
    `input: ${entry.input}`,
    `test_set: ${entry.testSet}`,
    `timestamp: ${entry.timestamp}`,
    "",
    "🧠 MODEL OUTPUT TRACE",
    `intent_core: ${entry.intentCore}`,
    `expanded_intents: ${entry.expandedIntents.join(" | ")}`,
    `abstraction_level (L0~L4): ${entry.abstractionLevel}`,
    `routing_decision: ${entry.routingDecision}`,
    `scheduling_conflict: ${entry.schedulingConflict ? "yes" : "no"}`,
    `conflict_type: ${entry.conflictType}`,
    "",
    "⚠️ FAILURE ANALYSIS",
    `failure_mode: ${entry.failure.failureMode}`,
    `confidence_score (0~1): ${entry.failure.confidenceScore.toFixed(2)}`,
    `system_weak_point: ${entry.failure.systemWeakPoint}`,
    `notes: ${entry.failure.notes || "—"}`,
    "",
    "💰 TOKEN + COST METRICS",
    `input_tokens: ${entry.cost.inputTokens}`,
    `output_tokens: ${entry.cost.outputTokens}`,
    `total_tokens: ${entry.cost.totalTokens}`,
    `estimated_cost (USD): $${entry.cost.estimatedCostUsd.toFixed(6)}`,
    `cost_per_intent: $${entry.cost.costPerIntent.toFixed(6)}`,
    `cost_per_routing_decision: $${entry.cost.costPerRoutingDecision.toFixed(6)}`,
    `cost_flag: ${entry.cost.costFlag}`,
    "",
    "⚡ PERFORMANCE METRICS",
    `response_time_ms: ${Math.round(entry.latency.responseTimeMs)}`,
    `routing_time_ms: ${Math.round(entry.latency.routingTimeMs)}`,
    `scheduling_check_time_ms: ${Math.round(entry.latency.schedulingCheckTimeMs)}`,
    "",
    "📉 SYSTEM LOAD SIGNALS",
    `context_length: ${entry.load.contextLength}`,
    `prompt_complexity_score (1~10): ${entry.load.promptComplexityScore}`,
    `recursion_depth: ${entry.load.recursionDepth}`,
    `retry_count: ${entry.load.retryCount}`,
    "",
    "🎯 CLASSIFICATION ACCURACY",
    `expected_abstraction_level: ${entry.expectedAbstractionLevel}`,
    `predicted_abstraction_level: ${entry.predictedAbstractionLevel}`,
    `abstraction_error: ${entry.abstractionError ? "yes" : "no"}`,
    `expected_routing: ${entry.expectedRouting}`,
    `conflict_resolution_type: ${entry.conflictResolutionType}`,
    "---",
  ];
  return lines.join("\n");
}

export function formatHardcoreBatchSummary(summary: HardcoreBatchSummary): string {
  const lines = [
    "",
    "🧾 BATCH SUMMARY",
    `total_tests: ${summary.totalTests}`,
    `total_tokens_used: ${summary.totalTokensUsed}`,
    `total_cost: $${summary.totalCostUsd.toFixed(6)}`,
    `avg_latency: ${summary.avgLatencyMs}ms`,
    `failure_rate: ${summary.failureRate}%`,
    "",
    "🔥 TOP FAILURE MODES",
    ...summary.topFailureModes.slice(0, 5).map((m) => `  ${m.mode}: ${m.count}`),
    "",
    "🧠 WEAK POINT MAP",
    `abstraction breakdown zone: ${summary.abstractionCollapseZones[0]?.level ?? "none"} (${summary.abstractionCollapseZones[0]?.failCount ?? 0})`,
    `routing confusion zone: ${summary.routingConfusionMap[0] ? `${summary.routingConfusionMap[0].expected}→${summary.routingConfusionMap[0].predicted}` : "none"}`,
    `scheduling blind spot: ${summary.schedulingBlindSpots[0] ?? "none"}`,
    `over-structuring trigger: ${summary.overStructuringTriggers[0] ?? "none"}`,
    "",
    "📊 CRITICAL METRICS",
    `ambiguity_collapse_rate: ${summary.criticalMetrics.ambiguityCollapseRate}%`,
    `multi_intent_overload_rate: ${summary.criticalMetrics.multiIntentOverloadRate}%`,
    `scheduling_override_failure_rate: ${summary.criticalMetrics.schedulingOverrideFailureRate}%`,
    `abstraction_misclassification_rate: ${summary.criticalMetrics.abstractionMisclassificationRate}%`,
    `over_structuring_failure_rate: ${summary.criticalMetrics.overStructuringFailureRate}%`,
    "",
    "🧪 ADVERSARIAL RESISTANCE",
    `boundary_break_failure_rate: ${summary.adversarialResistance.boundaryBreakFailureRate}%`,
    `noise_injection_failure_rate: ${summary.adversarialResistance.noiseInjectionFailureRate}%`,
    `intent_conflict_survival_rate: ${summary.adversarialResistance.intentConflictSurvivalRate}%`,
    `context_drift_handling_score: ${summary.adversarialResistance.contextDriftHandlingScore}%`,
    "",
    "🎯 TOP 5 WEAKEST SCENARIOS",
    ...summary.top5WeakestScenarios.map(
      (s, i) => `  ${i + 1}. [${s.testId}] ${s.input} → ${s.weakPoint}`
    ),
    "",
    "💡 SYSTEM INSIGHT",
    `most_vulnerable_input_type: ${summary.systemInsight.mostVulnerableInputType}`,
    `highest_cost_case: ${summary.systemInsight.highestCostCase}`,
    `slowest_routing_path: ${summary.systemInsight.slowestRoutingPath}`,
  ];

  if (summary.costWarnings.length > 0) {
    lines.push("", "🚨 COST WARNINGS");
    for (const w of summary.costWarnings) {
      lines.push(`  ⚠ ${w}`);
    }
  }

  return lines.join("\n");
}
