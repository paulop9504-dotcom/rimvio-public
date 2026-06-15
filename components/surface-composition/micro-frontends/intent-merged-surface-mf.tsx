"use client";

import { memo } from "react";
import { PrimarySurfaceMf } from "@/components/surface-composition/micro-frontends/primary-surface-mf";
import type { PrimarySurfaceMfProps } from "@/components/surface-composition/micro-frontends/primary-surface-mf";

/** LOW_SIGNAL — one dominant hypothesis, no competing primaries. */
export const IntentMergedSurfaceMf = memo(function IntentMergedSurfaceMf(
  props: PrimarySurfaceMfProps,
) {
  return (
    <div data-intent-merged="true">
      <p className="mb-2 px-1 text-[11px] font-medium uppercase tracking-wide text-rimvio-ink/45">
        한 가지 흐름으로 정리했어요
      </p>
      <PrimarySurfaceMf {...props} />
    </div>
  );
});
