import type { EnrichedLink, EnricherContext } from "@/lib/enrichers/types";

import {

  addLocalLink,

  buildLocalLinkFromEnriched,

} from "@/lib/local-links/store";

import { setPinnedUrl } from "@/lib/local-links/pinned-link";

import { sharedLinkExpiresAt } from "@/lib/share/scrape-shared-link";



export async function persistEnrichedLink(

  enriched: EnrichedLink,

  context?: EnricherContext

) {

  setPinnedUrl(enriched.url);



  try {

    const response = await fetch("/api/scrape", {

      method: "POST",

      headers: { "Content-Type": "application/json" },

      body: JSON.stringify({

        url: enriched.url,

        persist: true,

        category: buildLocalLinkFromEnriched(enriched).category,

        expiresAt: sharedLinkExpiresAt(),

        context,

      }),

      cache: "no-store",

    });



    if (response.ok) {

      const result = (await response.json()) as EnrichedLink & {

        link?: unknown;

      };



      if (result.link) {

        return result.link;

      }

    }

  } catch {

    // Fall through to local storage.

  }



  const link = buildLocalLinkFromEnriched(enriched);

  addLocalLink(link);

  return link;

}



/** Sync write for Share → Now → Feed (before navigation). */

export function persistEnrichedLinkOptimistic(enriched: EnrichedLink) {

  setPinnedUrl(enriched.url);

  const link = buildLocalLinkFromEnriched(enriched);

  addLocalLink(link);

  return link;

}


