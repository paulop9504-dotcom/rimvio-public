"use client";

import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";
import type { RimvioGlobeHubProps } from "@/components/experience/rimvio-globe-hub";

const RimvioGlobeHubLazy = dynamic(
  () =>
    import("@/components/experience/rimvio-globe-hub").then((mod) => mod.RimvioGlobeHub),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[60vh] flex-1 items-center justify-center px-6 text-center text-[14px] text-muted-foreground">
        지구 불러오는 중…
      </div>
    ),
  },
);

export function RimvioGlobeHubClient(props: RimvioGlobeHubProps) {
  return <RimvioGlobeHubLazy {...props} className={cn(props.className)} />;
}
