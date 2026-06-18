"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  RealtimeChannel,
  RealtimePostgresChangesPayload,
} from "@supabase/supabase-js";
import { toast } from "sonner";
import { readLocalLinks, readDismissedLinkIds, importLocalLinks } from "@/lib/local-links/store";
import { seedDemoLinks, LOCAL_LINKS_UPDATED } from "@/lib/demo/seed";
import { experimentLabLinks } from "@/lib/demo/experiment-lab-links";
import {
  ensureExperimentLabFeed,
  isExperimentLabMode,
} from "@/lib/demo/reset-experiment-lab";
import {
  dismissSampleFeed,
  dismissSampleFeedIfRealLinkAdded,
  isSampleFeedLink,
  resetFeedStorageForSamples,
  resolveSampleFeedLinks,
  SKIP_DEMO_SEED_ONCE_KEY,
} from "@/lib/onboarding/sample-feed";
import {
  COMPLETION_UPDATED,
  isLinkOpen,
} from "@/lib/behavior/completion";
import { restoreDismissedLink } from "@/lib/links/dismiss-link";
import { funFeedLinks } from "@/lib/demo/fun-feed-links";
import { normalizeLinkReadAloudActions } from "@/lib/actions/read-aloud-action";
import {
  normalizeLinkUrl,
  readPinnedUrl,
} from "@/lib/local-links/pinned-link";
import { tryCreateClient } from "@/lib/supabase/client";
import {
  filterActiveLinks,
  filterArchivedLinks,
} from "@/lib/utils/link-archive";
import type { LinkRow } from "@/types/database";

const LINKS_TABLE = "links";
const LINKS_CHANNEL = "links-feed";

type RealtimePayload = RealtimePostgresChangesPayload<LinkRow>;

function sortLinks(links: LinkRow[]) {
  return [...links]
    .map(normalizeLinkReadAloudActions)
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
}

function prioritizePinnedLinks(links: LinkRow[]) {
  const pinned = readPinnedUrl();
  if (!pinned) {
    return links;
  }

  const normalizedPinned = normalizeLinkUrl(pinned);
  const index = links.findIndex(
    (link) => normalizeLinkUrl(link.original_url) === normalizedPinned
  );

  if (index <= 0) {
    return links;
  }

  const next = [...links];
  const [pinnedLink] = next.splice(index, 1);
  return [pinnedLink, ...next];
}

function isOptimisticId(id: string) {
  return id.startsWith("optimistic-");
}

function resolveEmptyFeedFallback(dismissed: Set<string>): LinkRow[] {
  const samples = resolveSampleFeedLinks().filter((link) => !dismissed.has(link.id));
  if (samples.length > 0) {
    return samples;
  }

  if (isExperimentLabMode()) {
    return experimentLabLinks.filter((link) => !dismissed.has(link.id));
  }

  if (process.env.NODE_ENV === "development") {
    return funFeedLinks.filter((link) => !dismissed.has(link.id));
  }

  return [];
}

function applyRealtimeChange(
  links: LinkRow[],
  payload: RealtimePayload,
  optimisticIds: Set<string>
): LinkRow[] {
  if (payload.eventType === "INSERT" && payload.new) {
    const withoutDuplicate = links.filter((link) => link.id !== payload.new.id);

    const optimisticMatchIndex = withoutDuplicate.findIndex(
      (link) =>
        isOptimisticId(link.id) &&
        (link.original_url === payload.new.original_url ||
          optimisticIds.has(link.id))
    );

    if (optimisticMatchIndex >= 0) {
      const matched = withoutDuplicate[optimisticMatchIndex];
      optimisticIds.delete(matched.id);
      const next = [...withoutDuplicate];
      next[optimisticMatchIndex] = payload.new;
      return sortLinks(next);
    }

    return sortLinks([payload.new, ...withoutDuplicate]);
  }

  if (payload.eventType === "UPDATE" && payload.new) {
    return sortLinks(
      links.map((link) => (link.id === payload.new.id ? payload.new : link))
    );
  }

  if (payload.eventType === "DELETE" && payload.old?.id) {
    optimisticIds.delete(payload.old.id);
    return links.filter((link) => link.id !== payload.old.id);
  }

  return links;
}

type RealtimeLinksContextValue = {
  links: LinkRow[];
  activeLinks: LinkRow[];
  archivedLinks: LinkRow[];
  addOptimisticLink: (link: LinkRow) => void;
  removeOptimisticLink: (id: string) => void;
  dismissLink: (link: LinkRow) => void;
  restoreLink: (link: LinkRow) => void;
  importFeedLinks: (raw: string) => number;
};

const RealtimeLinksContext = createContext<RealtimeLinksContextValue | null>(
  null
);

type RealtimeLinksProviderProps = {
  initialLinks: LinkRow[];
  userId?: string | null;
  children: ReactNode;
};

export function RealtimeLinksProvider({
  initialLinks,
  userId = null,
  children,
}: RealtimeLinksProviderProps) {
  const [links, setLinks] = useState(initialLinks);
  const [now, setNow] = useState(() => Date.now());
  /** Avoid SSR/client mismatch from sessionStorage pin reorder during hydration. */
  const [pinOrderReady, setPinOrderReady] = useState(false);
  const optimisticIdsRef = useRef<Set<string>>(new Set());
  const supabase = useMemo(() => tryCreateClient(), []);

  useEffect(() => {
    setPinOrderReady(true);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setLinks(initialLinks);
    optimisticIdsRef.current.clear();
  }, [initialLinks]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("resetFeed") === "1") {
      resetFeedStorageForSamples();
      params.delete("resetFeed");
      const next = params.toString() ? `/?${params.toString()}` : "/";
      window.history.replaceState(null, "", next);
    }

    const bootstrapDemoFeed = () => {
      if (process.env.NODE_ENV !== "development") {
        return;
      }

      if (sessionStorage.getItem(SKIP_DEMO_SEED_ONCE_KEY) === "1") {
        sessionStorage.removeItem(SKIP_DEMO_SEED_ONCE_KEY);
        return;
      }

      if (isExperimentLabMode()) {
        ensureExperimentLabFeed();
      } else {
        seedDemoLinks();
      }
    };

    const mergeLocalLinks = () => {
      const localLinks = readLocalLinks();
      const dismissed = readDismissedLinkIds();

      if (localLinks.some((link) => !isSampleFeedLink(link))) {
        dismissSampleFeed();
      }

      setLinks((current) => {
        const next = current.filter((link) => !dismissed.has(link.id));

        if (!localLinks.length) {
          const fallback = resolveEmptyFeedFallback(dismissed);
          return next.length > 0 ? next : fallback;
        }

        const localUrls = new Set(localLinks.map((link) => link.original_url));
        const withoutDuplicates = next.filter(
          (link) => !localUrls.has(link.original_url)
        );

        const mergedLocal = localLinks.filter((link) => !dismissed.has(link.id));

        return sortLinks([...mergedLocal, ...withoutDuplicates]);
      });
    };

    bootstrapDemoFeed();
    mergeLocalLinks();
    window.addEventListener(LOCAL_LINKS_UPDATED, mergeLocalLinks);
    window.addEventListener(COMPLETION_UPDATED, mergeLocalLinks);
    return () => {
      window.removeEventListener(LOCAL_LINKS_UPDATED, mergeLocalLinks);
      window.removeEventListener(COMPLETION_UPDATED, mergeLocalLinks);
    };
  }, []);

  const addOptimisticLink = useCallback((link: LinkRow) => {
    dismissSampleFeedIfRealLinkAdded(link);
    optimisticIdsRef.current.add(link.id);
    setLinks((current) =>
      sortLinks([link, ...current.filter((item) => item.id !== link.id)])
    );
  }, []);

  const removeOptimisticLink = useCallback((id: string) => {
    optimisticIdsRef.current.delete(id);
    setLinks((current) => current.filter((link) => link.id !== id));
  }, []);

  const dismissLink = useCallback((link: LinkRow) => {
    optimisticIdsRef.current.delete(link.id);
    setLinks((current) => current.filter((item) => item.id !== link.id));
  }, []);

  const restoreLink = useCallback((link: LinkRow) => {
    setLinks((current) =>
      sortLinks([link, ...current.filter((item) => item.id !== link.id)])
    );
    void restoreDismissedLink(link);
  }, []);

  const importFeedLinks = useCallback((raw: string) => {
    const imported = importLocalLinks(raw);
    const dismissed = readDismissedLinkIds();

    setLinks((current) => {
      const importedUrls = new Set(imported.map((link) => link.original_url));
      const rest = current.filter(
        (link) =>
          !importedUrls.has(link.original_url) && !dismissed.has(link.id)
      );

      return sortLinks([
        ...imported.filter((link) => !dismissed.has(link.id)),
        ...rest,
      ]);
    });

    return imported.length;
  }, []);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    let channel: RealtimeChannel;

    const subscribe = () => {
      const changeConfig: {
        event: "*";
        schema: "public";
        table: string;
        filter?: string;
      } = {
        event: "*",
        schema: "public",
        table: LINKS_TABLE,
      };

      if (userId) {
        changeConfig.filter = `user_id=eq.${userId}`;
      }

      channel = supabase
        .channel(userId ? `${LINKS_CHANNEL}:${userId}` : LINKS_CHANNEL)
        .on("postgres_changes", changeConfig, (payload) => {
            const typedPayload = payload as RealtimePayload;

            setLinks((current) =>
              applyRealtimeChange(
                current,
                typedPayload,
                optimisticIdsRef.current
              )
            );

            if (typedPayload.eventType === "INSERT" && typedPayload.new) {
              dismissSampleFeedIfRealLinkAdded(typedPayload.new);
              toast("하나 더 쌓였어요", {
                description: typedPayload.new.title,
              });
            }
          }
        )
        .subscribe();
    };

    subscribe();

    return () => {
      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [supabase, userId]);

  const activeLinks = useMemo(
    () => {
      const filtered = filterActiveLinks(links.filter(isLinkOpen), now);
      if (!pinOrderReady) {
        return filtered;
      }
      return prioritizePinnedLinks(filtered);
    },
    [links, now, pinOrderReady]
  );

  const archivedLinks = useMemo(
    () => filterArchivedLinks(links, now),
    [links, now]
  );

  const value = useMemo(
    () => ({
      links,
      activeLinks,
      archivedLinks,
      addOptimisticLink,
      removeOptimisticLink,
      dismissLink,
      restoreLink,
      importFeedLinks,
    }),
    [
      links,
      activeLinks,
      archivedLinks,
      addOptimisticLink,
      removeOptimisticLink,
      dismissLink,
      restoreLink,
      importFeedLinks,
    ]
  );

  return (
    <RealtimeLinksContext.Provider value={value}>
      {children}
    </RealtimeLinksContext.Provider>
  );
}

export function useRealtimeLinks() {
  const context = useContext(RealtimeLinksContext);

  if (!context) {
    throw new Error("useRealtimeLinks must be used within RealtimeLinksProvider");
  }

  return context;
}

export function useRealtimeLinksOptional() {
  return useContext(RealtimeLinksContext);
}
