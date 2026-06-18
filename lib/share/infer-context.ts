"use client";



import {

  inferLocationCategory,

} from "@/lib/enrichers/context";

import type { EnricherContext } from "@/lib/enrichers/types";



const STORAGE_KEY = "blink-installed-apps";



const DEFAULT_MOCK_APPS = ["kakaomap"];



export function inferEnricherContext(): EnricherContext {

  const hour = new Date().getHours();

  const installedApps = readInstalledApps();



  return {

    hour,

    installedApps,

    locationCategory: inferLocationCategory(hour),

  };

}



function readInstalledApps() {

  if (typeof window === "undefined") {

    return DEFAULT_MOCK_APPS;

  }



  try {

    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {

      return DEFAULT_MOCK_APPS;

    }



    const parsed = JSON.parse(raw) as string[];

    return Array.isArray(parsed) && parsed.length

      ? parsed.map((app) => app.toLowerCase())

      : DEFAULT_MOCK_APPS;

  } catch {

    return DEFAULT_MOCK_APPS;

  }

}



export function setInstalledAppsForDemo(apps: string[]) {

  localStorage.setItem(

    STORAGE_KEY,

    JSON.stringify(apps.map((app) => app.toLowerCase()))

  );

}


