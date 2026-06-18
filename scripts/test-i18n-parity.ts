#!/usr/bin/env npx tsx
/**
 * Ensures locale bundles expose the same copy shape as Korean source of truth.
 * Usage: npm run test:i18n
 */

import assert from "node:assert/strict";
import { copy as copyKo } from "../lib/copy/human-ko";
import { copyEn } from "../lib/i18n/bundles/en";

type Leaf = string | ((...args: never[]) => string);

function collectPaths(value: unknown, prefix = ""): string[] {
  if (typeof value === "function") {
    return prefix ? [prefix] : [];
  }

  if (typeof value === "string") {
    return prefix ? [prefix] : [];
  }

  if (!value || typeof value !== "object") {
    return prefix ? [prefix] : [];
  }

  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
    collectPaths(child, prefix ? `${prefix}.${key}` : key)
  );
}

const koPaths = new Set(collectPaths(copyKo));
const enPaths = new Set(collectPaths(copyEn));

const missingInEn = [...koPaths].filter((path) => !enPaths.has(path)).sort();
const extraInEn = [...enPaths].filter((path) => !koPaths.has(path)).sort();

let failed = 0;

if (missingInEn.length > 0) {
  failed += 1;
  console.error("✗ English copy missing keys:");
  for (const path of missingInEn) {
    console.error(`  - ${path}`);
  }
}

if (extraInEn.length > 0) {
  failed += 1;
  console.error("✗ English copy has unexpected keys:");
  for (const path of extraInEn) {
    console.error(`  - ${path}`);
  }
}

if (failed === 0) {
  console.log(`✓ i18n parity OK (${koPaths.size} keys)`);
  process.exit(0);
}

process.exit(1);
