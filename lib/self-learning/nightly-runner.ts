import { spawnSync } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  assertSelfLearningGate,
  runSelfLearningGate,
} from "@/lib/self-learning/gate-runner";
import {
  evaluateUnifiedStressRun,
  runUnifiedStressCase,
} from "@/lib/testing/unified-stress/evaluate-unified-stress";
import { UNIFIED_STRESS_CASES } from "@/lib/testing/unified-stress/unified-stress-banks";

const GATE_THRESHOLD = 0.95;
const STRESS_THRESHOLD = 0.9;

const masterContext = {
  currentDate: "2026-06-02",
  trustLevel: "L1" as const,
  existingSchedule: [],
  allReminders: [],
  userGoals: [],
  activitySources: [],
  conversationMemories: [],
  activeContainers: [],
  activeChains: [],
  activeChain: null,
  userDefinedActions: [],
  mapApp: "kakao" as const,
};

export type NightlyQAReport = {
  timestamp: string;
  playbook_pass: boolean;
  gate_score: number;
  gate_pass: boolean;
  stress_score: number;
  stress_pass: boolean;
  accepted: boolean;
};

function runNpmScript(script: string): boolean {
  const result = spawnSync("npm run", [script], {
    shell: true,
    stdio: "inherit",
    env: process.env,
  });
  return result.status === 0;
}

export async function scoreUnifiedStress(): Promise<number> {
  if (UNIFIED_STRESS_CASES.length === 0) {
    return 1;
  }

  let passed = 0;
  for (const testCase of UNIFIED_STRESS_CASES) {
    const run = await runUnifiedStressCase(testCase, masterContext);
    const evaluation = evaluateUnifiedStressRun(run);
    if (evaluation.pass) {
      passed += 1;
    }
  }

  return passed / UNIFIED_STRESS_CASES.length;
}

export async function runNightlyQA(input?: {
  playbookThreshold?: number;
  gateThreshold?: number;
  stressThreshold?: number;
  reportPath?: string;
}): Promise<NightlyQAReport> {
  const gateThreshold = input?.gateThreshold ?? GATE_THRESHOLD;
  const stressThreshold = input?.stressThreshold ?? STRESS_THRESHOLD;

  console.log("🌙 Nightly QA start");

  const playbookPass = runNpmScript("test:playbook");
  const gate = await runSelfLearningGate({ threshold: gateThreshold });
  const stressScore = await scoreUnifiedStress();

  const report: NightlyQAReport = {
    timestamp: new Date().toISOString(),
    playbook_pass: playbookPass,
    gate_score: gate.score,
    gate_pass: gate.score >= gateThreshold,
    stress_score: stressScore,
    stress_pass: stressScore >= stressThreshold,
    accepted:
      playbookPass &&
      gate.score >= gateThreshold &&
      stressScore >= stressThreshold,
  };

  const reportPath =
    input?.reportPath ??
    join(process.cwd(), ".cursor", "nightly-qa-report.json");
  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.log(JSON.stringify(report, null, 2));

  if (!report.accepted) {
    console.error("❌ NIGHTLY REGRESSION DETECTED");
  } else {
    console.log("✅ Nightly QA passed");
  }

  return report;
}

export async function assertNightlyQA(): Promise<NightlyQAReport> {
  const report = await runNightlyQA();
  if (!report.accepted) {
    throw new Error("NIGHTLY_QA_FAILED");
  }
  return report;
}

/** Fast gate-only check (CI). */
export { assertSelfLearningGate, runSelfLearningGate };
