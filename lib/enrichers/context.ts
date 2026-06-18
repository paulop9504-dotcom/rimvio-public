import { LINK_CATEGORIES } from "@/lib/categories/types";
import type {
  CategoryWeights,
  EnricherContext,
  LocationCategory,
  SuiteWeights,
} from "@/lib/enrichers/types";
import { ALL_SMART_SUITES } from "@/lib/actions/smart-suite-types";



export const DEFAULT_ENRICHER_CONTEXT: EnricherContext = {

  hour: new Date().getHours(),

  installedApps: [],

  locationCategory: "unknown",

};



export function inferLocationCategory(hour: number): LocationCategory {

  if (isCommuteHour(hour)) {

    return "commute";

  }



  if (hour >= 22 || hour < 6) {

    return "home";

  }



  if (hour >= 9 && hour < 18) {

    return "office";

  }



  return "unknown";

}



export function normalizeEnricherContext(

  partial?: Partial<EnricherContext> | null

): EnricherContext {

  const hour =

    typeof partial?.hour === "number" && partial.hour >= 0 && partial.hour <= 23

      ? partial.hour

      : DEFAULT_ENRICHER_CONTEXT.hour;



  const installedApps = Array.isArray(partial?.installedApps)

    ? partial.installedApps

        .filter((app): app is string => typeof app === "string")

        .map((app) => app.trim().toLowerCase())

        .filter(Boolean)

    : DEFAULT_ENRICHER_CONTEXT.installedApps;



  const locationCategory =

    partial?.locationCategory &&

    ["commute", "home", "office", "unknown"].includes(partial.locationCategory)

      ? partial.locationCategory

      : inferLocationCategory(hour);



  const categoryWeights = normalizeCategoryWeights(partial?.categoryWeights);
  const suiteWeights = normalizeSuiteWeights(partial?.suiteWeights);

  return {
    hour,
    installedApps,
    locationCategory,
    ...(categoryWeights ? { categoryWeights } : {}),
    ...(suiteWeights ? { suiteWeights } : {}),
    ...(partial?.pinnedSuites ? { pinnedSuites: partial.pinnedSuites } : {}),
    ...(partial?.routing ? { routing: partial.routing } : {}),
    ...(partial?.preloadedPageMetadata
      ? { preloadedPageMetadata: partial.preloadedPageMetadata }
      : {}),
  };
}

function normalizeCategoryWeights(
  partial?: CategoryWeights | null
): CategoryWeights | undefined {
  if (!partial || typeof partial !== "object") {
    return undefined;
  }

  const weights: CategoryWeights = {};
  let hasValue = false;

  for (const category of LINK_CATEGORIES) {
    const raw = partial[category];
    if (typeof raw !== "number" || Number.isNaN(raw) || raw <= 0) {
      continue;
    }

    weights[category] = Math.min(1, raw);
    hasValue = true;
  }

  return hasValue ? weights : undefined;
}

function normalizeSuiteWeights(
  partial?: SuiteWeights | null
): SuiteWeights | undefined {
  if (!partial || typeof partial !== "object") {
    return undefined;
  }

  const weights: SuiteWeights = {};
  let hasValue = false;

  for (const suite of ALL_SMART_SUITES) {
    const raw = partial[suite];
    if (typeof raw !== "number" || Number.isNaN(raw) || raw <= 0) {
      continue;
    }

    weights[suite] = Math.min(1, raw);
    hasValue = true;
  }

  return hasValue ? weights : undefined;
}



export function isCommuteHour(hour: number) {

  return hour >= 7 && hour < 10;

}



export function hasInstalledApp(context: EnricherContext, appId: string) {

  return context.installedApps.includes(appId.toLowerCase());

}


