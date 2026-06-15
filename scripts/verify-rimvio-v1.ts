#!/usr/bin/env npx tsx
/**
 * Rimvio v1 release gate — static verification of P0 modules and boundaries.
 * Exit 0 = PASS, 1 = FAIL.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { composeSurfaceFrame, resetSurfaceCollapseStateForTests } from "@/lib/surface-composition";
import { assertCompositionInvariants } from "@/lib/surface-composition/composition-invariants";
import { resolveSurfaces } from "@/lib/surface-engine";
import { RIMVIO_CORE_API_VERSION } from "@/lib/core/rimvio-v1-contracts";

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

type Violation = { id: string; message: string; severity: "P0" | "P1" };

const violations: Violation[] = [];

function requirePath(rel: string, id: string): void {
  const full = path.join(REPO, rel);
  if (!fs.existsSync(full)) {
    violations.push({ id, message: `Missing required path: ${rel}`, severity: "P0" });
  }
}

function requireFileContains(rel: string, pattern: string | RegExp, id: string): void {
  const full = path.join(REPO, rel);
  if (!fs.existsSync(full)) {
    violations.push({ id, message: `Missing file for pattern check: ${rel}`, severity: "P0" });
    return;
  }
  const text = fs.readFileSync(full, "utf8");
  const ok = typeof pattern === "string" ? text.includes(pattern) : pattern.test(text);
  if (!ok) {
    violations.push({
      id,
      message: `Pattern not found in ${rel}: ${String(pattern)}`,
      severity: "P0",
    });
  }
}

function checkCoreModules(): void {
  const modules = [
    "lib/loop-wiring/loop-wiring-engine.ts",
    "lib/memory/surface-memory-commit.ts",
    "lib/surface-composition/surface-collapse-controller.ts",
    "lib/execution/execution-dispatcher.ts",
    "lib/surface-engine/surface-resolver.ts",
    "lib/capability-registry/capability-dispatcher.ts",
    "lib/core/rimvio-v1-contracts.ts",
    "lib/core/index.ts",
    "lib/surface/index.ts",
    "lib/runtime/index.ts",
    "lib/experimental/index.ts",
  ];
  for (const mod of modules) {
    requirePath(mod, `core-module-${mod}`);
  }
}

function checkMemoryPipeline(): void {
  requireFileContains(
    "lib/execution/execution-dispatcher.ts",
    "commitSurfaceMemoryFromExecution",
    "memory-pipeline-wired",
  );
  requireFileContains(
    "components/action-chat-feed.tsx",
    "useSurfaceMemory",
    "feed-memory-hook",
  );
  requireFileContains(
    "components/action-chat-feed.tsx",
    "completedActionIds: surfaceMemory.completedActionIds",
    "feed-completed-ids",
  );
}

function checkSurfaceCollapse(): void {
  requireFileContains(
    "lib/surface-composition/build-surface-graph.ts",
    "collapseSurfaceDecisionStream",
    "collapse-in-graph",
  );
  requireFileContains(
    "lib/surface-composition/composition-invariants.ts",
    "secondary slots must be latent-only",
    "collapse-invariant",
  );
  requireFileContains(
    "components/action-chat-feed.tsx",
    "shouldRenderLatentSuggestionLayers",
    "latent-feed-gate",
  );
  requireFileContains(
    "components/action-chat-feed.tsx",
    "prepSurface.visible && showLatentSuggestionLayers",
    "prep-latent-gate",
  );
  requireFileContains(
    "components/action-chat-feed.tsx",
    "dockActions.length > 0 && showLatentSuggestionLayers",
    "dock-latent-gate",
  );
}

function checkSingleActiveSurfaceRuntime(): void {
  resetSurfaceCollapseStateForTests();
  const engine = resolveSurfaces({
    dateKey: "2026-06-07",
    context: { now: new Date("2026-06-07T12:00:00.000Z") },
  });
  const frame = composeSurfaceFrame(engine, engine.routes.FEED);
  try {
    assertCompositionInvariants(frame.layout);
  } catch (error) {
    violations.push({
      id: "single-active-invariant",
      message: error instanceof Error ? error.message : String(error),
      severity: "P0",
    });
  }
  if (frame.layout.secondary.length > 0) {
    violations.push({
      id: "no-secondary-render",
      message: `Expected 0 secondary surfaces, got ${frame.layout.secondary.length}`,
      severity: "P0",
    });
  }
  if (!frame.layout.primary) {
    violations.push({
      id: "primary-required",
      message: "Active decision stream requires primary surface",
      severity: "P0",
    });
  }
}

function checkPackageVersion(): void {
  const pkg = JSON.parse(
    fs.readFileSync(path.join(REPO, "package.json"), "utf8"),
  ) as { version?: string; rimvio?: { release?: string } };
  if (pkg.version !== "1.0.0-rimvio-alpha") {
    violations.push({
      id: "package-version",
      message: `Expected version 1.0.0-rimvio-alpha, got ${pkg.version ?? "undefined"}`,
      severity: "P0",
    });
  }
  if (pkg.rimvio?.release !== "v1-alpha") {
    violations.push({
      id: "rimvio-release-key",
      message: 'package.json must set rimvio.release = "v1-alpha"',
      severity: "P1",
    });
  }
  if (RIMVIO_CORE_API_VERSION !== "1.0.0-rimvio-alpha") {
    violations.push({
      id: "core-api-version",
      message: `RIMVIO_CORE_API_VERSION mismatch: ${RIMVIO_CORE_API_VERSION}`,
      severity: "P0",
    });
  }
}

function checkManifest(): void {
  requirePath("docs/RIMVIO_RELEASE_V1_MANIFEST.md", "release-manifest");
}

function checkKnownP1Warnings(): void {
  // Documented limitations — warn only, do not fail release gate.
  const feed = fs.readFileSync(path.join(REPO, "components/action-chat-feed.tsx"), "utf8");
  if (feed.includes("coldStartVisible") && feed.includes("SurfaceCompositionRuntime")) {
    console.warn(
      "[verify-rimvio-v1] P1 note: cold start + surface can coexist — see manifest limitations.",
    );
  }
}

function main(): void {
  checkCoreModules();
  checkMemoryPipeline();
  checkSurfaceCollapse();
  checkSingleActiveSurfaceRuntime();
  checkPackageVersion();
  checkManifest();
  checkKnownP1Warnings();

  const p0 = violations.filter((row) => row.severity === "P0");
  const p1 = violations.filter((row) => row.severity === "P1");

  if (violations.length === 0) {
    console.log("RIMVIO V1 VERIFY: PASS");
    console.log(`  coreApiVersion: ${RIMVIO_CORE_API_VERSION}`);
    process.exit(0);
  }

  console.error("RIMVIO V1 VERIFY: FAIL");
  for (const row of p0) {
    console.error(`  [P0] ${row.id}: ${row.message}`);
  }
  for (const row of p1) {
    console.error(`  [P1] ${row.id}: ${row.message}`);
  }
  process.exit(p0.length > 0 ? 1 : 0);
}

main();
