import type { EnricherContext } from "@/lib/enrichers/types";

import { hasInstalledApp } from "@/lib/enrichers/context";



/** Keep bins coarse (~6 combos) to avoid overfitting. */

export function toContextBin(context: EnricherContext) {

  const dayPart =

    context.locationCategory !== "unknown"

      ? context.locationCategory

      : context.hour >= 22 || context.hour < 6

        ? "night"

        : "day";



  const apps = hasInstalledApp(context, "kakaomap") ? "kakaomap" : "default";



  return `${dayPart}|${apps}`;

}


