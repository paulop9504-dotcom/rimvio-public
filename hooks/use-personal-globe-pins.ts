"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { PersonalGlobePinViewer } from "@/lib/globe/personal-globe-pin-types";
import {
  listPersonalGlobePins,
  PERSONAL_GLOBE_PINS_UPDATED,
} from "@/lib/globe/personal-globe-pin-store";
import {
  globeViewForPersonalPins,
  projectPersonalGlobeClassifiedPins,
} from "@/lib/globe/project-personal-globe-pins";

export function usePersonalGlobePins(viewer: PersonalGlobePinViewer) {
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const bump = () => setRevision((value) => value + 1);
    bump();
    window.addEventListener(PERSONAL_GLOBE_PINS_UPDATED, bump);
    return () => window.removeEventListener(PERSONAL_GLOBE_PINS_UPDATED, bump);
  }, []);

  const pins = useMemo(() => listPersonalGlobePins(), [revision]);

  const classifiedPins = useMemo(
    () => projectPersonalGlobeClassifiedPins(viewer, pins),
    [pins, viewer],
  );

  const globe = useMemo(
    () =>
      globeViewForPersonalPins(
        classifiedPins,
        viewer.isOwner ? "내 지구본" : "함께한 지구",
      ),
    [classifiedPins, viewer.isOwner],
  );

  const refresh = useCallback(() => {
    setRevision((value) => value + 1);
  }, []);

  const pinById = useMemo(() => {
    const map = new Map<string, (typeof pins)[number]>();
    for (const pin of pins) {
      map.set(pin.pinId, pin);
    }
    return map;
  }, [pins]);

  return {
    pins,
    classifiedPins,
    globe,
    pinById,
    refresh,
  };
}
