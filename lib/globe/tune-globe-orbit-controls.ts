import type { GlobeInstance } from "globe.gl";
import { isTouchZoomDevice } from "@/lib/globe/is-touch-zoom-device";

export type OrbitControlsLike = ReturnType<GlobeInstance["controls"]>;

/** Apple Maps–grade orbit feel — damping, touch split, mobile rotate speed. */
export function tuneGlobeOrbitControls(controls: OrbitControlsLike): void {
  controls.enablePan = false;
  controls.autoRotate = false;
  controls.enableDamping = true;
  controls.dampingFactor = 0.078;
  controls.rotateSpeed = 0.42;
  controls.zoomSpeed = 0.95;

  const touchDevice = isTouchZoomDevice();
  const touches = controls.touches as
    | { ONE?: number; TWO?: number }
    | undefined;
  if (touches) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const TOUCH = (controls.constructor as any)?.TOUCH ?? {
      ROTATE: 0,
      PAN: 1,
      DOLLY_PAN: 2,
      DOLLY_ROTATE: 3,
    };
    touches.ONE = TOUCH.ROTATE;
    touches.TWO = TOUCH.DOLLY;
  }

  if (touchDevice) {
    controls.rotateSpeed = 0.46;
    controls.dampingFactor = 0.042;
    controls.enableZoom = true;
  }
}
