"use client";

import { useEffect } from "react";
import { readLocalLinks } from "@/lib/local-links/store";
import { seedDemoLinks } from "@/lib/demo/seed";
import {
  ensureExperimentLabFeed,
  isExperimentLabMode,
} from "@/lib/demo/reset-experiment-lab";

/** Auto-seed demo links in development on first visit. */
export function DevDemoSeed() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") {
      return;
    }

    if (isExperimentLabMode()) {
      ensureExperimentLabFeed();
      return;
    }

    const existing = readLocalLinks();
    if (existing.length === 0) {
      seedDemoLinks(true);
    }
  }, []);

  return null;
}
