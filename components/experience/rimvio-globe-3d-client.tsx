"use client";

import dynamic from "next/dynamic";
import { forwardRef } from "react";
import type {
  RimvioGlobe3DHandle,
  RimvioGlobe3DProps,
} from "@/components/experience/rimvio-globe-3d";
import { cn } from "@/lib/utils";

const RimvioGlobe3DLazy = dynamic(
  () =>
    import("@/components/experience/rimvio-globe-3d").then((mod) => mod.RimvioGlobe3D),
  {
    ssr: false,
    loading: () => (
      <div className="rimvio-globe-space rimvio-globe-space--toss flex min-h-[60vh] flex-1 items-center justify-center px-6 text-center text-[14px] text-[#8b95a1]">
        지도 불러오는 중…
      </div>
    ),
  },
);

export const RimvioGlobe3DClient = forwardRef<RimvioGlobe3DHandle, RimvioGlobe3DProps>(
  function RimvioGlobe3DClient(props, ref) {
    return <RimvioGlobe3DLazy {...props} ref={ref} className={cn(props.className)} />;
  },
);
