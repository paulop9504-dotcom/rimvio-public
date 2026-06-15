"use client";

import { useExperienceGravityIngest } from "@/hooks/use-experience-gravity-ingest";

/** 7-day media scan + Experience Gravity burst detection. */
export function ExperienceGravityBootstrap() {
  useExperienceGravityIngest({ enabled: true });
  return null;
}
