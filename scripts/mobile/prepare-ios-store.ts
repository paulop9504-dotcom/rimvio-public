#!/usr/bin/env npx tsx

import { execSync } from "node:child_process";
import { STORE_LAUNCH } from "@/lib/mobile/store-launch-config";
import {
  printStoreLaunchReport,
  runIosStoreLaunchChecks,
} from "./store-launch-checks";

const args = new Set(process.argv.slice(2));
const shouldSync = args.has("--sync");

function main(): number {
  const checks = runIosStoreLaunchChecks();
  const code = printStoreLaunchReport({ platform: "ios", checks });

  console.log("Next steps (Mac required):");
  console.log("  1. npm run store:icons && npm run store:screenshots");
  console.log("  2. $env:CAPACITOR_SERVER_URL=\"https://rimvio.app\"  # or your prod URL");
  console.log("  3. npm run store:prepare:ios -- --sync");
  console.log("  4. npm run mobile:ios   → Xcode → Signing → Archive → TestFlight");
  console.log("  5. Build App + RimvioLiveActivityWidget (already in project.pbxproj)");
  console.log("     · Sign both targets; verify Live Activity on device (iOS 16.2+)");
  console.log(`  6. Paste review notes from ${STORE_LAUNCH.ios.reviewNotes}`);
  console.log(`  7. Follow ${STORE_LAUNCH.ios.doc}\n`);

  if (shouldSync && code === 0) {
    console.log("Running cap sync…");
    execSync("npx cap sync ios", { stdio: "inherit" });
  }

  return code;
}

process.exit(main());
