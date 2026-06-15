"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addResourcePoolItem,
  countResourcePoolItems,
  createResourcePoolRepo,
  deleteResourcePoolItem,
  deleteResourcePoolRepo,
  exportResourcePoolSnapshot,
  importResourcePoolSnapshot,
  listResourcePoolItems,
  listResourcePoolRepos,
  RESOURCE_POOL_UPDATED,
  searchResourcePoolItems,
  syncFeedLinksToResourcePool,
  updateResourcePoolItem,
} from "@/lib/resource-pool/resource-pool-store";
import type {
  ResourcePoolItem,
  ResourcePoolItemKind,
  ResourcePoolRepo,
} from "@/lib/resource-pool/resource-pool-types";

export function useResourcePool(options?: {
  repoId?: string | null;
  query?: string;
}) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const refresh = () => setTick((value) => value + 1);
    window.addEventListener(RESOURCE_POOL_UPDATED, refresh);
    return () => window.removeEventListener(RESOURCE_POOL_UPDATED, refresh);
  }, []);

  const repos = useMemo(() => listResourcePoolRepos(), [tick]);
  const items = useMemo(() => {
    if (options?.query?.trim()) {
      return searchResourcePoolItems(options.query, options.repoId ?? undefined);
    }
    return listResourcePoolItems(options?.repoId ?? undefined);
  }, [options?.query, options?.repoId, tick]);

  const totalCount = useMemo(() => countResourcePoolItems(), [tick]);
  const inboxCount = useMemo(() => countResourcePoolItems("inbox"), [tick]);

  const addItem = useCallback(
    (input: {
      repoId?: string;
      kind: ResourcePoolItemKind;
      title: string;
      body?: string;
      url?: string;
      thumbnail?: string;
      sourceLinkId?: string;
    }) => addResourcePoolItem(input),
    [],
  );

  const createRepo = useCallback(
    (input: { name: string; description?: string; color?: string }) =>
      createResourcePoolRepo(input),
    [],
  );

  const toggleStar = useCallback((itemId: string, starred: boolean) => {
    updateResourcePoolItem(itemId, { starred });
  }, []);

  const moveItem = useCallback((itemId: string, repoId: string) => {
    updateResourcePoolItem(itemId, { repoId });
  }, []);

  const removeItem = useCallback((itemId: string) => {
    deleteResourcePoolItem(itemId);
  }, []);

  const removeRepo = useCallback((repoId: string) => deleteResourcePoolRepo(repoId), []);

  const exportSnapshot = useCallback(() => exportResourcePoolSnapshot(), []);

  const importSnapshot = useCallback(
    (raw: string, mode: "merge" | "replace" = "merge") =>
      importResourcePoolSnapshot(raw, mode),
    [],
  );

  const syncLinks = useCallback(
    (
      links: Array<{
        id: string;
        title: string;
        original_url: string;
        thumbnail?: string | null;
      }>,
    ) => syncFeedLinksToResourcePool(links),
    [],
  );

  return {
    repos,
    items,
    totalCount,
    inboxCount,
    addItem,
    createRepo,
    toggleStar,
    moveItem,
    removeItem,
    removeRepo,
    exportSnapshot,
    importSnapshot,
    syncLinks,
    refresh: () => setTick((value) => value + 1),
  };
}

export type { ResourcePoolItem, ResourcePoolRepo, ResourcePoolItemKind };
