import { isExperimentLabMode } from "@/lib/demo/reset-experiment-lab";
import {
  clearDismissedLinkIds,
  readLocalLinks,
  writeLocalLinks,
} from "@/lib/local-links/store";
import {
  buildSampleFeedLinks,
  SAMPLE_FEED_LINK_IDS,
} from "@/lib/onboarding/sample-feed-links";
import type { LinkRow } from "@/types/database";

const SAMPLE_FEED_KEY = "rimvio.sample-feed.v2";

type SampleFeedState = {
  dismissed: boolean;
};

function readState(): SampleFeedState {
  if (typeof window === "undefined") {
    return { dismissed: false };
  }

  try {
    const raw = localStorage.getItem(SAMPLE_FEED_KEY);
    if (!raw) {
      return { dismissed: false };
    }

    const parsed = JSON.parse(raw) as Partial<SampleFeedState>;
    return { dismissed: parsed.dismissed === true };
  } catch {
    return { dismissed: false };
  }
}

function writeState(state: SampleFeedState) {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(SAMPLE_FEED_KEY, JSON.stringify(state));
}

export function isSampleFeedLink(
  link: Pick<LinkRow, "id"> | string | null | undefined
): boolean {
  const id = typeof link === "string" ? link : link?.id;
  if (!id) {
    return false;
  }

  return id.startsWith("sample-");
}

export function shouldShowSampleFeed(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  if (isExperimentLabMode()) {
    return false;
  }

  if (readState().dismissed) {
    return false;
  }

  const localLinks = readLocalLinks();
  const hasRealLinks = localLinks.some((link) => !isSampleFeedLink(link));
  return !hasRealLinks;
}

export function dismissSampleFeed() {
  writeState({ dismissed: true });
}

export function resetSampleFeedForDev() {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.removeItem(SAMPLE_FEED_KEY);
  localStorage.removeItem("rimvio.sample-feed.v1");
}

export const SKIP_DEMO_SEED_ONCE_KEY = "rimvio.skip-demo-seed-once";

/** Wipe local feed + sample dismiss flags so the 14-card deck reinjects. */
export function resetFeedStorageForSamples() {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.removeItem("rimvio.sample-feed.v1");
  localStorage.removeItem(SAMPLE_FEED_KEY);
  writeLocalLinks([]);
  clearDismissedLinkIds();
  localStorage.removeItem("blink-fun-feed-v3");
  sessionStorage.setItem(SKIP_DEMO_SEED_ONCE_KEY, "1");

  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("rimvio-local-links-updated"));
  }
}

/** Inject curated sample cards when the feed would otherwise be empty. */
export function resolveSampleFeedLinks(): LinkRow[] {
  if (!shouldShowSampleFeed()) {
    return [];
  }

  return buildSampleFeedLinks();
}

export function dismissSampleFeedIfRealLinkAdded(link: LinkRow) {
  if (!isSampleFeedLink(link)) {
    dismissSampleFeed();
  }
}

export function maybeDismissSampleFeedAfterSwipe(dismissedIds: Set<string>) {
  const allSampleDismissed = SAMPLE_FEED_LINK_IDS.every((id) =>
    dismissedIds.has(id)
  );

  if (allSampleDismissed) {
    dismissSampleFeed();
  }
}
