/** Touch-first devices — custom focal pinch replaces OrbitControls dolly. */
export function isTouchZoomDevice(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  if (window.matchMedia("(pointer: coarse)").matches) {
    return true;
  }
  if (window.matchMedia("(hover: none)").matches) {
    return true;
  }
  if (typeof navigator !== "undefined" && navigator.maxTouchPoints > 1) {
    return true;
  }
  return "ontouchstart" in window;
}
