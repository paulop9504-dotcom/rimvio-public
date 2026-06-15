#!/usr/bin/env npx tsx

import { execSync } from "node:child_process";
import { STORE_LAUNCH } from "@/lib/mobile/store-launch-config";
import {
  printStoreLaunchReport,
  runAndroidStoreLaunchChecks,
} from "./store-launch-checks";

const args = new Set(process.argv.slice(2));
const shouldSync = args.has("--sync");

function main(): number {
  const checks = runAndroidStoreLaunchChecks();
  const code = printStoreLaunchReport({ platform: "android", checks });

  console.log("Next steps (Windows OK):");
  console.log("  1. npm run store:icons && npm run store:screenshots");
  console.log("  2. $env:CAPACITOR_SERVER_URL=\"https://rimvio.app\"  # or your prod URL");
  console.log("  3. npm run store:prepare:android -- --sync");
  console.log("  4. npm run mobile:android → Build → Generate Signed Bundle (AAB)");
  console.log(`  5. Upload AAB to Play Console internal testing`);
  console.log(`  6. Follow ${STORE_LAUNCH.android.doc}\n`);

  if (shouldSync && code === 0) {
    console.log("Running cap sync…");
    execSync("npx cap sync android", { stdio: "inherit" });
  }

  return code;
}

process.exit(main());
