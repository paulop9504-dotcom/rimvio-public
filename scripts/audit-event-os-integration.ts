#!/usr/bin/env npx tsx
/**
 * Event OS 1~5단계 통합 검수
 * CausalProof · Replay · Lock/Queue · Counterfactual · Graph+Golden · E2E
 */
import { runEventOsIntegrationAudit } from "../lib/event-os/audit/event-os-integration-audit";

const report = runEventOsIntegrationAudit();

console.log(JSON.stringify(report, null, 2));

for (const s of report.stages) {
  const mark = s.pass ? "✔" : "✘";
  console.log(`${mark} ${s.stage}${s.violations.length ? ` — ${s.violations.join("; ")}` : ""}`);
}

if (report.status !== "PASS") {
  console.error("\nevent-os-integration-audit: FAIL");
  process.exit(1);
}

console.log("\nevent-os-integration-audit: PASS — 5 stages + E2E consistent");
