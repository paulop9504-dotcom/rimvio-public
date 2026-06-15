"use client";

import dynamic from "next/dynamic";
import type { GlobeVectorMapStageProps } from "@/components/globe/globe-vector-map-stage";

const GlobeVectorMapStageLazy = dynamic(
  () =>
    import("@/components/globe/globe-vector-map-stage").then(
      (mod) => mod.GlobeVectorMapStage,
    ),
  { ssr: false },
);

export function GlobeVectorMapStageClient(props: GlobeVectorMapStageProps) {
  return <GlobeVectorMapStageLazy {...props} />;
}
