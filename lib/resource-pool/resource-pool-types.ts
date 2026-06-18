export type ResourcePoolItemKind = "memo" | "link" | "photo" | "misc";

export type ResourcePoolRepo = {
  id: string;
  name: string;
  description: string;
  color: string;
  pinned: boolean;
  system: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ResourcePoolItem = {
  id: string;
  repoId: string;
  kind: ResourcePoolItemKind;
  title: string;
  body: string;
  url?: string;
  thumbnail?: string;
  sourceLinkId?: string;
  starred: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ResourcePoolSnapshot = {
  version: 1;
  exportedAt: string;
  repos: ResourcePoolRepo[];
  items: ResourcePoolItem[];
};
