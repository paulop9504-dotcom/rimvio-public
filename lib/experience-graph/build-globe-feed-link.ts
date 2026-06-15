export type GlobeFeedLinkParams = {
  clusterId?: string | null;
  eventId?: string | null;
  mediaId?: string | null;
};

/** Experience → globe home recall deep link. */
export function buildGlobeFeedHref(params: GlobeFeedLinkParams): string {
  const search = new URLSearchParams();
  const clusterId = params.clusterId?.trim();
  const eventId = params.eventId?.trim();
  const mediaId = params.mediaId?.trim();

  if (clusterId) {
    search.set("recallCluster", clusterId);
  }
  if (eventId) {
    search.set("recallEvent", eventId);
  }
  if (mediaId) {
    search.set("recallMedia", mediaId);
  }

  const query = search.toString();
  return query ? `/?${query}` : "/";
}

export function parseGlobeFeedLink(
  searchParams: Pick<URLSearchParams, "get">,
): GlobeFeedLinkParams {
  return {
    clusterId: searchParams.get("cluster"),
    eventId: searchParams.get("event"),
    mediaId: searchParams.get("media"),
  };
}

export function resolveGlobeClusterFromEventId(
  eventId: string | null | undefined,
  volumes: readonly { sourceEventId: string; space: { clusterId: string } }[],
): string | null {
  const id = eventId?.trim();
  if (!id) {
    return null;
  }
  return volumes.find((volume) => volume.sourceEventId === id)?.space.clusterId ?? null;
}
