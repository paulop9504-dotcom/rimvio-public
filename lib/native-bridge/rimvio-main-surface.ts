import { registerPlugin } from "@capacitor/core";
import type { RimvioMainSurfacePlugin } from "@/lib/native-bridge/rimvio-main-surface.types";

export const RimvioMainSurface = registerPlugin<RimvioMainSurfacePlugin>(
  "RimvioMainSurface",
  {
    web: () =>
      import("@/lib/native-bridge/rimvio-main-surface.web").then(
        (module) => new module.RimvioMainSurfaceWeb(),
      ),
  },
);
