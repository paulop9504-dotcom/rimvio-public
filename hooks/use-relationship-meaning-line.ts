"use client";

import { useEffect, useMemo, useState } from "react";
import { projectRelationshipMeaningLine } from "@/lib/copy/project-relationship-meaning-line";
import type { RelationshipMeaningProjection } from "@/lib/meaning/relationship-meaning-types";
import {
  EVENT_CANDIDATES_UPDATED,
  listLifeEventCandidates,
} from "@/lib/life-read-model";

/** Client read — peer MEANING line from life events. */
export function useRelationshipMeaningLine(
  peerDisplayName: string | null | undefined,
): RelationshipMeaningProjection | null {
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const refresh = () => setRevision((value) => value + 1);
    refresh();
    window.addEventListener(EVENT_CANDIDATES_UPDATED, refresh);
    return () => window.removeEventListener(EVENT_CANDIDATES_UPDATED, refresh);
  }, []);

  return useMemo(() => {
    void revision;
    const label = peerDisplayName?.trim();
    if (!label) {
      return null;
    }
    return projectRelationshipMeaningLine({
      displayName: label,
      events: listLifeEventCandidates(),
    });
  }, [peerDisplayName, revision]);
}
