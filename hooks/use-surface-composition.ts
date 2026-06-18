"use client";

import { useMemo } from "react";
import {
  composeSurfaceFrame,
  surfaceCompositionFrameKey,
} from "@/lib/surface-composition";
import {
  useSurfaceEngine,
  type UseSurfaceEngineInput,
} from "@/hooks/use-surface-engine";

export type { UseSurfaceEngineInput };

/**
 * Surface Composition hook — engine output → graph → layout slots.
 * UI shells must use this (or `frame` from it), not raw surface lists.
 */
export function useSurfaceComposition(input: UseSurfaceEngineInput = {}) {
  const engineState = useSurfaceEngine(input);

  const frame = useMemo(
    () => composeSurfaceFrame(engineState.result, engineState.feed),
    [engineState.result, engineState.feed],
  );

  const compositionKey = useMemo(() => surfaceCompositionFrameKey(frame), [frame]);

  return {
    ...engineState,
    frame,
    layout: frame.layout,
    graph: frame.graph,
    compositionKey,
  };
}
