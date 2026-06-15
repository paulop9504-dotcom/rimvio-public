import assert from "node:assert/strict";
import { applyGlobeAnimationPower } from "@/lib/globe/globe-animation-power";

function createMockGlobe() {
  let paused = false;
  let resumeCount = 0;
  let pauseCount = 0;
  return {
    globe: {
      pauseAnimation() {
        paused = true;
        pauseCount += 1;
      },
      resumeAnimation() {
        paused = false;
        resumeCount += 1;
      },
    },
    get paused() {
      return paused;
    },
    get resumeCount() {
      return resumeCount;
    },
    get pauseCount() {
      return pauseCount;
    },
  };
}

{
  const mock = createMockGlobe();
  applyGlobeAnimationPower(mock.globe as never, "suspended");
  assert.equal(mock.paused, true);
}

{
  const mock = createMockGlobe();
  applyGlobeAnimationPower(mock.globe as never, "full");
  assert.equal(mock.resumeCount, 1);
}

console.log("test-globe-animation-power: ok");
