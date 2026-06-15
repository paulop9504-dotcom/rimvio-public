import type { GlobeInstance } from "globe.gl";
import type { OrbitControlsLike } from "@/lib/globe/tune-globe-orbit-controls";

/** Stop an in-flight orbit drag so custom pinch can take over. */
export function releaseOrbitControlsGesture(controls: OrbitControlsLike): void {
  controls.enableRotate = false;
  controls.enableZoom = false;
  const internal = controls as OrbitControlsLike & { state?: number };
  if (typeof internal.state === "number") {
    internal.state = -1;
  }
}

export function restoreOrbitControlsGesture(
  controls: OrbitControlsLike,
  input?: { enableRotate?: boolean; enableZoom?: boolean },
): void {
  controls.enableRotate = input?.enableRotate ?? true;
  controls.enableZoom = input?.enableZoom ?? true;
}
