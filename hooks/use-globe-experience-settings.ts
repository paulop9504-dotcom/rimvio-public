"use client";

import { useCallback, useEffect, useState } from "react";
import {
  GLOBE_EXPERIENCE_SETTINGS_UPDATED,
  readGlobeExperienceSettings,
  writeGlobeExperienceSettings,
  type GlobeExperienceSettings,
} from "@/lib/globe/globe-experience-settings";

export function useGlobeExperienceSettings() {
  const [settings, setSettings] = useState<GlobeExperienceSettings>(() =>
    readGlobeExperienceSettings(),
  );

  const sync = useCallback(() => {
    setSettings(readGlobeExperienceSettings());
  }, []);

  useEffect(() => {
    sync();
    window.addEventListener(GLOBE_EXPERIENCE_SETTINGS_UPDATED, sync);
    return () => window.removeEventListener(GLOBE_EXPERIENCE_SETTINGS_UPDATED, sync);
  }, [sync]);

  const patch = useCallback((next: Partial<GlobeExperienceSettings>) => {
    setSettings(writeGlobeExperienceSettings(next));
  }, []);

  return { settings, patch };
}
