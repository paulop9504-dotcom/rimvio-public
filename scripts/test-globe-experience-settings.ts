import assert from "node:assert/strict";
import {
  isGpsDwellIngestEnabled,
  isShowTripArcsEnabled,
  isSilentAutoAttachEnabled,
  readGlobeExperienceSettings,
  shouldRequireFeedCaptureVerify,
  writeGlobeExperienceSettings,
} from "@/lib/globe/globe-experience-settings";
import { CONTEXT_MATCH_HIGH_SCORE } from "@/lib/ingest/context-match-media-gate";

function testDefaults() {
  const settings = readGlobeExperienceSettings();
  assert.equal(settings.gpsDwellIngest, true);
  assert.equal(settings.silentAutoAttach, true);
  assert.equal(settings.showTripArcs, true);
  assert.equal(isGpsDwellIngestEnabled(), true);
  assert.equal(isSilentAutoAttachEnabled(), true);
  assert.equal(isShowTripArcsEnabled(), true);
}

function testSilentAutoAttachVerifyGate() {
  writeGlobeExperienceSettings({ silentAutoAttach: true });
  assert.equal(
    shouldRequireFeedCaptureVerify({ score: CONTEXT_MATCH_HIGH_SCORE }),
    false,
  );
  assert.equal(
    shouldRequireFeedCaptureVerify({ score: CONTEXT_MATCH_HIGH_SCORE - 0.01 }),
    true,
  );

  writeGlobeExperienceSettings({ silentAutoAttach: false });
  assert.equal(
    shouldRequireFeedCaptureVerify({ score: CONTEXT_MATCH_HIGH_SCORE }),
    true,
  );
  assert.equal(
    shouldRequireFeedCaptureVerify({ userConfirmedTarget: true, score: 0 }),
    false,
  );
}

function testPatch() {
  writeGlobeExperienceSettings({
    gpsDwellIngest: false,
    showTripArcs: false,
  });
  assert.equal(readGlobeExperienceSettings().gpsDwellIngest, false);
  assert.equal(readGlobeExperienceSettings().showTripArcs, false);
  writeGlobeExperienceSettings({
    gpsDwellIngest: true,
    showTripArcs: true,
    silentAutoAttach: true,
  });
}

testDefaults();
testSilentAutoAttachVerifyGate();
testPatch();
console.log("test-globe-experience-settings: ok");
