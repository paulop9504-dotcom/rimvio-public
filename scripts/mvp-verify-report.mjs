#!/usr/bin/env node
/**
 * MVP verification bundle — machine-readable report for OpenClaw / CI / Cursor handoff.
 * Usage: node scripts/mvp-verify-report.mjs [--json-only]
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const reportsDir = path.join(root, "reports");
const reportPath = path.join(reportsDir, "mvp-verify-latest.json");

const CORE_STEPS = [
  { id: "routing-patches", command: "npx", args: ["tsx", "scripts/test-routing-patches.ts"] },
  { id: "ux-guards", command: "npx", args: ["tsx", "scripts/test-ux-guards.ts"] },
  { id: "turn-os-boundary", command: "npx", args: ["tsx", "scripts/test-turn-os-boundary.ts"] },
  { id: "data-model-catalog", command: "npx", args: ["tsx", "scripts/test-data-model-catalog.ts"] },
  { id: "client-turn-route", command: "npx", args: ["tsx", "scripts/test-client-turn-route.ts"] },
  { id: "write-path-boundary", command: "npx", args: ["tsx", "scripts/test-write-path-boundary.ts"] },
  { id: "life-read-allowlist", command: "npx", args: ["tsx", "scripts/test-life-read-store-allowlist.ts"] },
  { id: "surface-engine", command: "npx", args: ["tsx", "scripts/test-surface-engine.ts"] },
  { id: "surface-ux-stability", command: "npx", args: ["tsx", "scripts/test-surface-ux-stability.ts"] },
  { id: "surface-composition", command: "npx", args: ["tsx", "scripts/test-surface-composition.ts"] },
  { id: "surface-adoption", command: "npx", args: ["tsx", "scripts/test-surface-adoption-boundary.ts"] },
  { id: "capability-registry", command: "npx", args: ["tsx", "scripts/test-capability-registry.ts"] },
  { id: "execution-plane", command: "npx", args: ["tsx", "scripts/test-execution-plane.ts"] },
  { id: "learning-layer", command: "npx", args: ["tsx", "scripts/test-learning-layer.ts"] },
  { id: "loop-wiring", command: "npx", args: ["tsx", "scripts/test-loop-wiring.ts"] },
  { id: "realtime-behavioral-os", command: "npx", args: ["tsx", "scripts/test-realtime.ts"] },
  { id: "system-stability", command: "npx", args: ["tsx", "scripts/test-stability.ts"] },
  { id: "platform-layer", command: "npx", args: ["tsx", "scripts/test-platform.ts"] },
  { id: "marketplace-layer", command: "npx", args: ["tsx", "scripts/test-marketplace.ts"] },
  { id: "timeline-read-only", command: "npx", args: ["tsx", "scripts/test-timeline-read-only-boundary.ts"] },
];

const EXTENDED_STEPS = [
  { id: "chat-three-axis", command: "npx", args: ["tsx", "scripts/test-chat-three-axis.ts"] },
  { id: "orchestrator-v2", command: "npx", args: ["tsx", "scripts/test-orchestrator-v2-pipeline.ts"] },
];

const MVP_STEPS = process.argv.includes("--full")
  ? [...CORE_STEPS, ...EXTENDED_STEPS]
  : CORE_STEPS;

function runStep(step) {
  return new Promise((resolve) => {
    const startedAt = Date.now();
    const child = spawn(step.command, step.args, {
      cwd: root,
      shell: process.platform === "win32",
      env: process.env,
    });
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr?.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("close", (code) => {
      resolve({
        id: step.id,
        ok: code === 0,
        exitCode: code ?? 1,
        durationMs: Date.now() - startedAt,
        stdout: stdout.trim().slice(-4000),
        stderr: stderr.trim().slice(-4000),
      });
    });
    child.on("error", (err) => {
      resolve({
        id: step.id,
        ok: false,
        exitCode: 1,
        durationMs: Date.now() - startedAt,
        stdout: "",
        stderr: String(err.message ?? err),
      });
    });
  });
}

async function main() {
  const startedAt = new Date().toISOString();
  const results = [];
  for (const step of MVP_STEPS) {
    process.stderr.write(`[mvp-verify] ${step.id}…\n`);
    results.push(await runStep(step));
  }

  const ok = results.every((r) => r.ok);
  const report = {
    kind: "rimvio_mvp_verify",
    version: 1,
    project: "rimvio",
    startedAt,
    finishedAt: new Date().toISOString(),
    ok,
    summary: ok
      ? "All MVP boundary checks passed."
      : `Failed: ${results.filter((r) => !r.ok).map((r) => r.id).join(", ")}`,
    steps: results,
    nextActions: ok
      ? ["Ship or run broader: npm run test:playbook"]
      : [
          "Fix failing step locally or invoke Cursor with this report path.",
          "Re-run: npm run test:mvp",
        ],
  };

  fs.mkdirSync(reportsDir, { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  const jsonOnly = process.argv.includes("--json-only");
  if (jsonOnly) {
    process.stdout.write(`${JSON.stringify(report)}\n`);
  } else {
    process.stdout.write(`${report.summary}\n`);
    process.stdout.write(`Report: ${reportPath}\n`);
  }

  process.exit(ok ? 0 : 1);
}

main().catch((err) => {
  console.error("[mvp-verify] fatal", err);
  process.exit(1);
});
