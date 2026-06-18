#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { STORE_LAUNCH } from "@/lib/mobile/store-launch-config";

function run() {
  const widget = STORE_LAUNCH.ios.liveActivityWidget;
  const pbxproj = fs.readFileSync(
    path.join(process.cwd(), STORE_LAUNCH.ios.xcodeProject, "project.pbxproj"),
    "utf8",
  );

  assert.ok(fs.existsSync(widget.swift), "widget swift exists");
  assert.ok(fs.existsSync(widget.sharedAttributes), "shared attributes exists");
  assert.ok(fs.existsSync(widget.controller), "live activity controller exists");
  assert.match(pbxproj, new RegExp(`PBXNativeTarget "${widget.pbxTargetName}"`));
  assert.match(pbxproj, /Embed Foundation Extensions/);
  assert.match(pbxproj, new RegExp(widget.extensionBundleId));
  assert.match(pbxproj, /RimvioMainSurfaceAttributes\.swift in Sources/);
  assert.match(pbxproj, /RimvioMainSurfaceLiveActivityController\.swift in Sources/);

  const widgetSourcesBlock = pbxproj.match(
    /R1MV4004WIDGET004 \/\* Sources \*\/ = \{[\s\S]*?\};/,
  )?.[0];
  assert.ok(widgetSourcesBlock, "widget Sources build phase");
  assert.match(widgetSourcesBlock!, /RimvioMainSurfaceAttributes\.swift in Sources/);
  assert.doesNotMatch(
    widgetSourcesBlock!,
    /RimvioMainSurfaceLiveActivityController\.swift in Sources/,
  );

  console.log("test-ios-live-activity-widget-target: ok");
}

run();
