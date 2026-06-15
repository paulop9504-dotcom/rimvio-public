"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { SYNAPSE_UPDATED_EVENT } from "@/lib/synaptic/synapse-engine";
import { readSynapticSnapshotSummary } from "@/lib/synaptic/synapse-view-model";

/**
 * Client subscription to persisted synaptic edges (expand / strengthen / weaken / prune).
 */
export function useSynapticSnapshot() {
  const [revision, setRevision] = useState(0);

  const refresh = useCallback(() => {
    setRevision((value) => value + 1);
  }, []);

  useEffect(() => {
    const onUpdate = () => refresh();
    window.addEventListener(SYNAPSE_UPDATED_EVENT, onUpdate);
    return () => window.removeEventListener(SYNAPSE_UPDATED_EVENT, onUpdate);
  }, [refresh]);

  return useMemo(() => {
    void revision;
    return readSynapticSnapshotSummary();
  }, [revision]);
}
