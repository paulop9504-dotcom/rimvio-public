"use client";

import { useCallback, useEffect, useState } from "react";
import {
  readSurfaceMemoryContext,
  SURFACE_MEMORY_UPDATED_EVENT,
} from "@/lib/memory";

/**
 * Client subscription to persisted surface memory (completed + dismissed).
 */
export function useSurfaceMemory() {
  const [revision, setRevision] = useState(0);

  const refresh = useCallback(() => {
    setRevision((value) => value + 1);
  }, []);

  useEffect(() => {
    const onUpdate = () => refresh();
    window.addEventListener(SURFACE_MEMORY_UPDATED_EVENT, onUpdate);
    return () => window.removeEventListener(SURFACE_MEMORY_UPDATED_EVENT, onUpdate);
  }, [refresh]);

  void revision;
  return readSurfaceMemoryContext();
}
