"use client";

import { memo } from "react";
import { PrimarySurfaceMf } from "@/components/surface-composition/micro-frontends/primary-surface-mf";
import type { PrimarySurfaceMfProps } from "@/components/surface-composition/micro-frontends/primary-surface-mf";

/** EMPTY / universal safety net — render-only. */
export const StartHereSurfaceMf = memo(function StartHereSurfaceMf(
  props: PrimarySurfaceMfProps,
) {
  return <PrimarySurfaceMf {...props} />;
});

export const IdleSurfaceMf = memo(function IdleSurfaceMf(props: PrimarySurfaceMfProps) {
  return <PrimarySurfaceMf {...props} />;
});
