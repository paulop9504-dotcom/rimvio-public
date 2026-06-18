import assert from "node:assert/strict";
import { isTouchZoomDevice } from "../lib/globe/is-touch-zoom-device";

assert.equal(isTouchZoomDevice(), false, "node has no touch");

console.log("test-is-touch-zoom-device: ok");
