#!/usr/bin/env npx tsx
import {
  COMMAND_SHORTCUTS_V1,
  shouldShowCommandShortcuts,
  suggestCommandShortcuts,
} from "../lib/command-os/command-shortcuts";

const violations: string[] = [];

function fail(msg: string) {
  violations.push(msg);
}

if (COMMAND_SHORTCUTS_V1.length > 3) {
  fail(`shortcut_count:${COMMAND_SHORTCUTS_V1.length}`);
}

const atOnly = suggestCommandShortcuts("@");
if (atOnly.length !== 3) {
  fail(`at_only:${atOnly.length}`);
}

const partial = suggestCommandShortcuts("@캘");
if (partial.length !== 1 || partial[0]?.id !== "calendar") {
  fail(`partial_calendar:${JSON.stringify(partial.map((s) => s.id))}`);
}

const full = suggestCommandShortcuts("@캘린더 14시 병원");
if (full.length !== 0) {
  fail(`full_query_should_hide:${full.length}`);
}

if (!shouldShowCommandShortcuts("@")) {
  fail("should_show_at");
}
if (shouldShowCommandShortcuts("안녕")) {
  fail("should_hide_plain");
}

const template = partial[0]?.template ?? "";
if (!template.startsWith("@캘린더")) {
  fail(`template:${template}`);
}

if (violations.length > 0) {
  console.error("FAIL command-shortcuts");
  for (const v of violations) {
    console.error(`  - ${v}`);
  }
  process.exit(1);
}

console.log("PASS command-shortcuts");
